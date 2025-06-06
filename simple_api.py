import os
import json
import asyncio
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from dotenv import dotenv_values
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import ForeignKey, select, distinct, func, delete, String
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field

from bitcoinlib.wallets import Wallet, wallet_create_or_open
from bitcoinlib.services.services import Service, ServiceError 

from httpx import AsyncClient, ConnectError, HTTPStatusError, TimeoutException

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Config:
    _config_values = dotenv_values(".env")

    BOT_TOKEN: str = _config_values.get("BOT_TOKEN", "")
    BOT_API: str = f"https://api.telegram.org/bot{BOT_TOKEN}" if BOT_TOKEN else ""
    FILE_API: str = f"https://api.telegram.org/file/bot{BOT_TOKEN}" if BOT_TOKEN else ""
    ADMIN_CHAT_ID: int = int(_config_values.get("ADMIN_CHAT_ID", "0"))
    DB_URL: str = _config_values.get("DB_URL", "sqlite+aiosqlite:///./sql_app.db")
    HTTP_TIMEOUT: int = int(_config_values.get("HTTP_TIMEOUT", "15"))

    BITCOIN_NETWORK: str = os.environ.get("BITCOIN_NETWORK", _config_values.get("BITCOIN_NETWORK", "testnet")) 
    PAYMENT_TOLERANCE_PERCENT: float = float(_config_values.get("PAYMENT_TOLERANCE_PERCENT", "0.95")) 

config = Config()

engine = create_async_engine(config.DB_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(index=True, unique=True)
    price: Mapped[int]
    gender: Mapped[str] = mapped_column(index=True)
    category: Mapped[str] = mapped_column(index=True)
    image_url: Mapped[str]

class CartItem(Base):
    __tablename__ = "cart"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(default=1)

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(index=True)
    name: Mapped[Optional[str]] = mapped_column(nullable=True)
    telegram_username: Mapped[Optional[str]] = mapped_column(nullable=True) 
    address: Mapped[Optional[str]] = mapped_column(nullable=True)
    postcode: Mapped[Optional[str]] = mapped_column(nullable=True)
    city: Mapped[Optional[str]] = mapped_column(nullable=True)
    country: Mapped[Optional[str]] = mapped_column(nullable=True)
    items: Mapped[str]
    total: Mapped[int] 
    status: Mapped[str] = mapped_column(default="unpaid", index=True)
    payment_address: Mapped[Optional[str]] = mapped_column(nullable=True, index=True) 
    payment_amount: Mapped[Optional[float]] = mapped_column(nullable=True) 
    created_at: Mapped[datetime] = mapped_column(default=func.now())

class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    price: int = Field(gt=0)
    gender: str = Field(min_length=1)
    category: str = Field(min_length=1)
    image_url: str = Field(min_length=1)

class ProductOut(ProductIn):
    id: int

    class Config:
        from_attributes = True

class CartProductOut(BaseModel):
    id: int
    name: str
    price: int
    gender: str
    category: str
    image_url: str
    quantity: int = Field(gt=0)

    class Config:
        from_attributes = True

class OrderIn(BaseModel):
    user_id: int = Field(gt=0)
    items: List[CartProductOut] = Field(min_items=1)
    total: int = Field(gt=0)
    name: Optional[str] = None 
    telegram_username: Optional[str] = None 
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class OrderOut(BaseModel):
    id: str
    user_id: int
    name: Optional[str] = None
    telegram_username: Optional[str] = None 
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    items: List[CartProductOut]
    total: int
    status: str
    payment_address: Optional[str] = None
    payment_amount: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_items_parsed(cls, obj: Order):
        items_parsed: List[CartProductOut] = []
        if obj.items:
            try:
                parsed_json = json.loads(obj.items)
                if isinstance(parsed_json, list):
                    items_parsed = [CartProductOut(**item_dict) for item_dict in parsed_json]
                else:
                    logger.warning(f"Order '{obj.id}' items field is not a JSON list: {obj.items}")
            except json.JSONDecodeError as e:
                logger.error(f"JSONDecodeError parsing items for order {obj.id}: {e}")
            except Exception as e:
                logger.error(f"Unknown error parsing items for order {obj.id}: {e}")

        return cls(
            id=obj.id,
            user_id=obj.user_id,
            name=obj.name,
            telegram_username=obj.telegram_username, 
            address=obj.address,
            postcode=obj.postcode,
            city=obj.city,
            country=obj.country,
            items=items_parsed,
            total=obj.total,
            status=obj.status,
            payment_address=obj.payment_address,
            payment_amount=obj.payment_amount,
            created_at=obj.created_at
        )

class UpdateOrderDeliveryIn(BaseModel):
    order_id: str
    name: str = Field(min_length=1)
    telegram_username: str = Field(min_length=1) 
    address: str = Field(min_length=1)
    postcode: str = Field(min_length=1)
    city: str = Field(min_length=1)
    country: str = Field(min_length=1)

class TelegramService:
    def __init__(self, bot_api: str, admin_chat_id: int, http_client: AsyncClient):
        self.bot_api = bot_api
        self.admin_chat_id = admin_chat_id
        self.http_client = http_client

    async def send_message(self, chat_id: int, text: str, parse_mode: str = "HTML"):
        if not self.admin_chat_id:
            logger.warning("ADMIN_CHAT_ID is not set. Message will not be sent.")
            return

        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        try:
            response = await self.http_client.post(f"{self.bot_api}/sendMessage", json=payload, timeout=config.HTTP_TIMEOUT)
            response.raise_for_status()
            logger.info(f"Message successfully sent to chat {chat_id}.")
        except (ConnectError, TimeoutException, HTTPStatusError) as e:
            logger.error(f"Failed to send message to Telegram (chat: {chat_id}) due to network/HTTP error: {e}")
        except Exception as e:
            logger.error(f"Failed to send message to Telegram (chat: {chat_id}): {e}")

    async def get_user_profile_photos(self, user_id: int) -> Optional[str]:
        try:
            response = await self.http_client.get(
                f"{self.bot_api}/getUserProfilePhotos",
                params={"user_id": user_id, "limit": 1},
                timeout=config.HTTP_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("ok") or not data["result"]["total_count"]:
                logger.info(f"Avatar for user {user_id} not found.")
                return None
            return data["result"]["photos"][0][0]["file_id"]
        except (ConnectError, TimeoutException, HTTPStatusError) as e:
            logger.error(f"Failed to get profile photo for user {user_id} due to network/HTTP error: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to get profile photo for user {user_id}: {e}")
            return None

    async def get_file_path(self, file_id: str) -> Optional[str]:
        try:
            response = await self.http_client.get(
                f"{self.bot_api}/getFile",
                params={"file_id": file_id},
                timeout=config.HTTP_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                logger.error(f"Failed to get file information for {file_id}: {data.get('description', 'Unknown error')}")
                return None
            return data["result"]["file_path"]
        except (ConnectError, TimeoutException, HTTPStatusError) as e:
            logger.error(f"Failed to get file_path for file_id {file_id} due to network/HTTP error: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to get file_path for file_id {file_id}: {e}")
            return None

    async def download_file(self, file_path: str):
        try:
            response = await self.http_client.get(f"{config.FILE_API}/{file_path}", timeout=config.HTTP_TIMEOUT)
            response.raise_for_status()
            return StreamingResponse(response.aiter_bytes(), media_type="image/jpeg")
        except (ConnectError, TimeoutException, HTTPStatusError) as e:
            logger.error(f"Failed to download file from path {file_path} due to network/HTTP error: {e}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to download avatar: {e}")
        except Exception as e:
            logger.error(f"Failed to download file from path {file_path}: {e}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to download avatar: {e}")

class BitcoinPaymentService:
    def __init__(self, network: str):
        self.network = network
        self.service = Service(network=self.network) 

    async def get_user_wallet(self, user_id: int) -> Wallet:
        wallet_name = f"user_{user_id}_{self.network}_wallet" 
        try:
            wallet = wallet_create_or_open(wallet_name, network=self.network)
            logger.info(f"Wallet '{wallet_name}' created or opened successfully on network '{self.network}'.")
            
            if hasattr(wallet, 'mnemonic') and wallet.mnemonic:
                logger.debug(f"Wallet '{wallet_name}' mnemonic: {wallet.mnemonic}")
            else:
                logger.info(f"Wallet '{wallet_name}' does not have a mnemonic or it's not exposed this way.")

            return wallet
        except Exception as create_e:
            logger.error(f"Failed to create or open wallet '{wallet_name}' for network '{self.network}': {create_e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create Bitcoin wallet: {create_e}")

    async def generate_new_payment_address(self, user_id: int) -> str:
        user_wallet = await self.get_user_wallet(user_id)
        new_key = user_wallet.get_key()
        logger.info(f"Generated new payment address from wallet '{user_wallet.name}' for network '{self.network}': {new_key.address}")
        
        if self.network == 'testnet':
            if not (new_key.address.startswith('tb1') or new_key.address.startswith('m') or new_key.address.startswith('n') or new_key.address.startswith('2')):
                 logger.warning(f"Generated address '{new_key.address}' for testnet doesn't look like a standard Bitcoin Testnet address (expected tb1, m, n, or 2).")
        elif self.network == 'mainnet':
            if not (new_key.address.startswith('bc1') or new_key.address.startswith('1') or new_key.address.startswith('3')):
                 logger.warning(f"Generated address '{new_key.address}' for mainnet doesn't look like a standard Bitcoin Mainnet address (expected bc1, 1, or 3).")
        return new_key.address

    async def get_btc_exchange_rate(self) -> float:
        try:
            async with AsyncClient() as client:
                response = await client.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur", timeout=config.HTTP_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                rate = data["bitcoin"]["eur"]
                logger.info(f"Received BTC/EUR rate from CoinGecko: {rate}")
                return rate
        except (ConnectError, TimeoutException, HTTPStatusError) as e:
            logger.warning(f"CoinGecko API failed ({e}). Trying backup exchange rate API.")
        except Exception as e:
            logger.warning(f"CoinGecko API failed with unexpected error ({e}). Trying backup exchange rate API.")
        
        try:
            async with AsyncClient() as client:
                response = await client.get("https://api.kraken.com/0/public/Ticker?pair=XBTEUR", timeout=config.HTTP_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                if data and 'result' in data and 'XXBTZEUR' in data['result'] and 'c' in data['result']['XXBTZEUR']:
                    rate = float(data['result']['XXBTZEUR']['c'][0])
                    logger.info(f"Received BTC/EUR rate from Kraken: {rate}")
                    return rate
                else:
                    raise ValueError("Kraken API response invalid or missing expected data.")
        except (ConnectError, TimeoutException, HTTPStatusError, ValueError) as e:
            logger.error(f"Both CoinGecko and Kraken APIs failed to retrieve BTC/EUR rate: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve BTC exchange rate from any source.")
        except Exception as e:
            logger.error(f"Unexpected error retrieving BTC/EUR rate from Kraken: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve BTC exchange rate due to unexpected error.")

    async def check_address_transactions(self, payment_address: str, required_amount_btc: float, tolerance_percent: float) -> bool:
        total_received_satoshi = 0
        try:
            transactions = self.service.gettransactions(payment_address) 

            for tx in transactions:
                for tx_out in tx.outputs:
                    if payment_address == tx_out.address:
                        total_received_satoshi += tx_out.value
            
            total_received_btc = total_received_satoshi / 100_000_000 
            
            logger.info(f"Address {payment_address} received: {total_received_btc:.8f} BTC. Required: {required_amount_btc:.8f} BTC.")

            return total_received_btc >= required_amount_btc * tolerance_percent

        except ServiceError as e:
            logger.error(f"Service provider error when checking transactions for address {payment_address} on network '{self.network}': {e}")
            return False 
        except Exception as e:
            logger.error(f"ERROR checking transactions for address {payment_address}: {e}", exc_info=True)
            return False


http_client = AsyncClient()
bitcoin_payment_service = BitcoinPaymentService(config.BITCOIN_NETWORK)
telegram_service = TelegramService(config.BOT_API, config.ADMIN_CHAT_ID, http_client)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("LIFESPAN: Initializing database.")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payment_checker_task = asyncio.create_task(check_payments_periodically())
    logger.info("LIFESPAN: Background task check_payments_periodically started.")

    yield

    logger.info("LIFESPAN: Application shutting down. Cancelling background tasks.")
    payment_checker_task.cancel()
    try:
        await payment_checker_task
    except asyncio.CancelledError:
        logger.info("LIFESPAN: Background task check_payments_periodically cancelled.")
    except Exception as e:
        logger.error(f"LIFESPAN: Error cancelling background task: {e}")

app = FastAPI(title="E-commerce API",
              description="API for managing products, carts, and orders, with Bitcoin payment support.",
              version="1.0.0",
              lifespan=lifespan) 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def check_payments_periodically():
    while True:
        try:
            logger.info("Starting payment checking cycle.")
            async with async_session() as session:
                unpaid_orders = (await session.execute(
                    select(Order).where(Order.status == "unpaid")
                )).scalars().all()

                if not unpaid_orders:
                    logger.info("No unpaid orders to check.")
                else:
                    logger.info(f"Found {len(unpaid_orders)} unpaid orders to check.")

                for order_db_obj in unpaid_orders:
                    logger.info(f"Processing order ID: {order_db_obj.id}, Payment Address: {order_db_obj.payment_address}")

                    if not order_db_obj.payment_address or order_db_obj.payment_amount is None:
                        logger.warning(f"Order {order_db_obj.id} has no payment address or amount. Skipping.")
                        continue

                    try:
                        is_paid = await bitcoin_payment_service.check_address_transactions(
                            order_db_obj.payment_address,
                            order_db_obj.payment_amount,
                            config.PAYMENT_TOLERANCE_PERCENT
                        )

                        if is_paid:
                            # Мы обновляем статус на "paid", но НЕ отправляем уведомление здесь.
                            # Уведомление будет отправлено, когда пользователь заполнит форму доставки.
                            if order_db_obj.status != "paid": # Только если статус меняется на "paid"
                                order_db_obj.status = "paid"
                                session.add(order_db_obj)
                                await session.commit()
                                await session.refresh(order_db_obj) 
                                logger.info(f"Order {order_db_obj.id} PAID by background check! Delivery details awaiting.")
                            else:
                                logger.info(f"Order {order_db_obj.id} already marked as paid. No action needed.")
                        else:
                            logger.info(f"Order {order_db_obj.id} not yet paid. Expected: {order_db_obj.payment_amount:.8f} BTC.")

                    except Exception as e:
                        logger.error(f"Failed to check payment for order {order_db_obj.id}: {e}", exc_info=True)

            await asyncio.sleep(60) 
        except asyncio.CancelledError:
            logger.info("check_payments_periodically task cancelled.")
            break
        except Exception as e:
            logger.critical(f"CRITICAL ERROR in check_payments_periodically loop: {e}. Attempting to continue in 60 seconds.", exc_info=True)
            await asyncio.sleep(60)

@app.get("/", summary="API Status Check")
async def root():
    return {"message": "Authorization successful!"}

@app.post("/add_product/", response_model=ProductOut, status_code=status.HTTP_201_CREATED, summary="Add a new product")
async def add_product(product: ProductIn, session: AsyncSession = Depends(get_session)):
    existing_product = await session.execute(
        select(Product)
        .where(Product.name == product.name)
        .where(Product.category == product.category)
        .where(Product.gender == product.gender)
    )
    if existing_product.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product with this name, category, and gender already exists.")

    db_product = Product(**product.model_dump())
    session.add(db_product)
    await session.commit()
    await session.refresh(db_product)
    logger.info(f"New product added: {db_product.name}")
    return db_product

@app.get("/get_products/", response_model=List[ProductOut], summary="Get all products") 
async def get_products(session: AsyncSession = Depends(get_session)):
    products = (await session.execute(select(Product))).scalars().all()
    return products

@app.get("/get_product/{product_id}", response_model=ProductOut, summary="Get product by ID")
async def get_product(product_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@app.get("/get_categories/", summary="Get product categories by gender") 
async def get_categories(gender: str = "unisex", session: AsyncSession = Depends(get_session)):
    categories = [row[0] for row in (await session.execute(
        select(distinct(Product.category)).where(Product.gender == gender)
    )).all()]
    return categories

@app.delete("/del_product/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete product by ID")
async def delete_product(product_id: int, session: AsyncSession = Depends(get_session)):
    product = (await session.execute(select(Product).where(Product.id == product_id))).scalars().one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    await session.delete(product)
    await session.commit()
    logger.info(f"Product with ID {product_id} deleted.")
    return

@app.delete("/del_category/{category_name}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete category and all products within it")
async def delete_category(category_name: str, session: AsyncSession = Depends(get_session)):
    products_in_category = (await session.execute(select(Product).where(Product.category == category_name))).scalars().all()
    if not products_in_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category '{category_name}' not found or is empty.")

    for product in products_in_category:
        await session.delete(product)
    await session.commit()
    logger.info(f"Category '{category_name}' and all its products deleted.")
    return

@app.get("/get_user_avatar/{user_id}", summary="Get Telegram user avatar")
async def get_avatar(user_id: int):
    file_id = await telegram_service.get_user_profile_photos(user_id)
    if not file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")

    file_path = await telegram_service.get_file_path(file_id)
    if not file_path:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get avatar file path")

    return await telegram_service.download_file(file_path)

@app.post("/add_to_cart/", status_code=status.HTTP_200_OK, summary="Add item to cart")
async def add_to_cart(user_id: int, product_id: int, quantity: int = 1, session: AsyncSession = Depends(get_session)):
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be a positive number.")

    product_exists = await session.execute(select(Product).where(Product.id == product_id))
    if not product_exists.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    cart_item = (await session.execute(
        select(CartItem).where(CartItem.user_id == user_id, CartItem.product_id == product_id)
    )).scalar_one_or_none()

    if cart_item:
        cart_item.quantity += quantity
        session.add(cart_item)
        logger.info(f"Quantity of product {product_id} in user {user_id}'s cart updated to {cart_item.quantity}.")
    else:
        db_cart_item = CartItem(user_id=user_id, product_id=product_id, quantity=quantity)
        session.add(db_cart_item)
        logger.info(f"Product {product_id} added to user {user_id}'s cart with quantity {quantity}.")

    await session.commit()
    return {"message": "Item added/updated in cart."}

@app.delete("/del_from_cart/", status_code=status.HTTP_200_OK, summary="Remove item from cart")
async def del_from_cart(user_id: int, product_id: int, quantity: int = 1, session: AsyncSession = Depends(get_session)):
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be a positive number.")

    cart_item = (await session.execute(
        select(CartItem).where(CartItem.user_id == user_id, CartItem.product_id == product_id)
    )).scalar_one_or_none()

    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in user's cart.")

    if cart_item.quantity > quantity:
        cart_item.quantity -= quantity
        session.add(cart_item)
        logger.info(f"Quantity of product {product_id} in user {user_id}'s cart reduced to {cart_item.quantity}.")
    else:
        await session.delete(cart_item)
        logger.info(f"Product {product_id} completely removed from user {user_id}'s cart.")

    await session.commit()
    return {"message": "Item removed from cart."}

@app.get("/get_cart/{user_id}", response_model=List[CartProductOut], summary="Get user's cart contents") 
async def get_cart(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Product, CartItem.quantity)
        .join(CartItem, Product.id == CartItem.product_id)
        .where(CartItem.user_id == user_id)
    )
    cart_items_data: List[CartProductOut] = []
    for product, quantity in result.all():
        cart_items_data.append(CartProductOut(
            id=product.id,
            name=product.name,
            price=product.price,
            gender=product.gender,
            category=product.category,
            image_url=product.image_url,
            quantity=quantity
        ))
    return cart_items_data

@app.post("/create_order/", response_model=OrderOut, status_code=status.HTTP_201_CREATED, summary="Create a new order")
async def create_order(order_in: OrderIn, session: AsyncSession = Depends(get_session)):
    cart_items = await get_cart(order_in.user_id, session)
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User's cart is empty. Cannot create order.")
    
    btc_rate_eur = await bitcoin_payment_service.get_btc_exchange_rate()
    payment_address = await bitcoin_payment_service.generate_new_payment_address(order_in.user_id)
    amount_required_btc = order_in.total / btc_rate_eur 
    
    items_json_string = json.dumps([item.model_dump() for item in order_in.items])

    order_db = Order( 
        user_id=order_in.user_id,
        name=None, 
        telegram_username=None, 
        address=None,
        postcode=None,
        city=None,
        country=None,
        total=order_in.total,
        status="unpaid", 
        payment_address=payment_address,
        payment_amount=amount_required_btc,
        items=items_json_string,
    )
    
    session.add(order_db)
    await session.commit()
    await session.refresh(order_db)

    # Уведомление о создании заказа здесь удалено.
    # Оно будет отправлено только после того, как заказ будет оплачен И данные доставки будут заполнены.

    await session.execute(
        delete(CartItem).where(CartItem.user_id == order_in.user_id)
    )
    await session.commit()
    logger.info(f"Order {order_db.id} successfully created for user {order_in.user_id}. Cart cleared.")

    return OrderOut.from_orm_with_items_parsed(order_db)

@app.get("/get_order_details/{order_id}", response_model=OrderOut, summary="Get order details by ID")
async def get_order_details(order_id: str, session: AsyncSession = Depends(get_session)):
    order_db_obj = (await session.execute(select(Order).where(Order.id == order_id))).scalars().first()
    if not order_db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    
    return OrderOut.from_orm_with_items_parsed(order_db_obj)

@app.put("/update_order_delivery/", response_model=OrderOut, summary="Update delivery information for an order")
async def update_order_delivery(
    delivery_data: UpdateOrderDeliveryIn, 
    session: AsyncSession = Depends(get_session)
):
    order_db_obj = (await session.execute(select(Order).where(Order.id == delivery_data.order_id))).scalars().first()
    if not order_db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    # Проверяем статус оплаты перед тем, как позволить обновить доставку.
    # Это гарантирует, что мы не примем данные доставки для неоплаченного заказа.
    if order_db_obj.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Order {order_db_obj.id} is not yet paid. Current status: {order_db_obj.status}. Please pay first."
        )

    # Обновляем поля доставки
    order_db_obj.name = delivery_data.name
    order_db_obj.telegram_username = delivery_data.telegram_username 
    order_db_obj.address = delivery_data.address
    order_db_obj.postcode = delivery_data.postcode
    order_db_obj.city = delivery_data.city
    order_db_obj.country = delivery_data.country

    await session.commit()
    await session.refresh(order_db_obj) # Обновляем объект для получения актуальных данных

    logger.info(f"Delivery information updated for order {order_db_obj.id}.")

    # ОТПРАВКА ПОДРОБНОГО УВЕДОМЛЕНИЯ АДМИНУ ПОСЛЕ ЗАПОЛНЕНИЯ ФОРМЫ И ОПЛАТЫ
    # Это уведомление теперь будет единственным и полным.
    order_out = OrderOut.from_orm_with_items_parsed(order_db_obj) # Парсим для удобства

    items_summary = "\n".join([
        f"- {item.name} (x{item.quantity}) = €{item.price * item.quantity:.2f}" 
        for item in order_out.items
    ])

    telegram_info = order_out.telegram_username if order_out.telegram_username else "Не указан"

    await telegram_service.send_message(
            chat_id=config.ADMIN_CHAT_ID,
            text=(
                f"📦 **New Paid Order with Delivery!**\n"
                f"**Order ID:** `{order_out.id}`\n"
                f"**User ID:** `{order_out.user_id}`\n"
                f"**Name:** {order_out.name or 'Not specified'}\n"
                f"**Telegram:** @{telegram_info}\n"  # Assuming telegram_info already has @ prefix or is just username
                f"**Delivery Address:** {order_out.address or 'Not specified'}\n"
                f"**City:** {order_out.city or 'Not specified'}\n"
                f"**Postal Code:** {order_out.postcode or 'Not specified'}\n"
                f"**Country:** {order_out.country or 'Not specified'}\n"
                f"\n🛍️ **Items:**\n{items_summary}\n"
                f"\n💰 **Total Amount (EUR):** €{order_out.total:.2f}\n"
                f"₿ **Paid (BTC):** {order_out.payment_amount:.8f} BTC\n"
                f"**Payment Address:** `{order_out.payment_address}`\n"
                f"**Status:** {order_out.status.upper()} ✅"
            ),
            parse_mode="Markdown"
        )
    
    return OrderOut.from_orm_with_items_parsed(order_db_obj)

@app.get("/check_payment/{order_id}", summary="Check order payment status")
async def check_payment_status(order_id: str, session: AsyncSession = Depends(get_session)):
    order_db_obj = (await session.execute(select(Order).where(Order.id == order_id))).scalars().first() 
    if not order_db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    
    if order_db_obj.status == "paid":
        logger.info(f"Order {order_id} already paid.")
        return {"status": "paid", "message": "Order is already paid."}
    
    if not order_db_obj.payment_address or order_db_obj.payment_amount is None:
        logger.warning(f"Order {order_id} has no payment address or amount. Cannot check payment.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has no payment address or amount assigned.")
    
    try:
        is_paid = await bitcoin_payment_service.check_address_transactions(
            order_db_obj.payment_address,
            order_db_obj.payment_amount,
            config.PAYMENT_TOLERANCE_PERCENT
        )

        if is_paid:
            if order_db_obj.status != "paid": # Только если статус меняется
                order_db_obj.status = "paid"
                session.add(order_db_obj)
                await session.commit()
                await session.refresh(order_db_obj) # Обновляем объект для актуальных данных
                logger.info(f"Order {order_id} is now PAID after manual check! Delivery details awaiting.")
            return {"status": "paid", "message": "Payment confirmed."}
        else:
            logger.info(f"Order {order_id} not yet paid based on manual check.")
            return {"status": "unpaid", "message": "Payment not yet received or confirmed."}

    except HTTPException as e:
        logger.error(f"HTTPException during manual payment check for order {order_id}: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during manual payment check for order {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during payment check.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("simple_api:app", host="0.0.0.0", port=8000, reload=True)