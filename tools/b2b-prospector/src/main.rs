use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod config;
mod errors;
mod handlers;
mod models;
mod routes;
mod services;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub redis: redis::aio::ConnectionManager,
    pub config: config::Config,
}

#[tokio::main]
async fn main() {
    // Load .env
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "b2b_prospector=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = config::Config::from_env();

    // Database pool
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&cfg.database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations at runtime
    sqlx::migrate::Migrator::new(std::path::Path::new("./migrations"))
        .await
        .expect("Failed to load migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!("Database connected and migrations applied");

    // Redis connection
    let redis_client =
        redis::Client::open(cfg.redis_url.as_str()).expect("Failed to create Redis client");
    let redis_conn = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("Failed to connect to Redis");

    tracing::info!("Redis connected");

    let state = AppState {
        db: pool,
        redis: redis_conn,
        config: cfg.clone(),
    };

    // JWT secret as extension for auth middleware
    let jwt_ext = cfg.jwt_secret.clone();

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build app
    let app = routes::create_router(state)
        .layer(axum::Extension(jwt_ext))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .fallback_service(ServeDir::new("static"));

    let addr: SocketAddr = cfg.server_addr().parse().expect("Invalid server address");
    tracing::info!("B2B Prospector starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind");

    axum::serve(listener, app).await.expect("Server error");
}
