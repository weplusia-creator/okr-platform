use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};

use crate::auth::middleware::auth_middleware;
use crate::handlers;
use crate::AppState;

pub fn create_router(state: AppState) -> Router {
    let public_routes = Router::new()
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/health", get(health_check));

    let protected_routes = Router::new()
        // Prospects
        .route("/api/prospects", get(handlers::prospects::list_prospects))
        .route("/api/prospects", post(handlers::prospects::create_prospect))
        .route("/api/prospects/:id", get(handlers::prospects::get_prospect))
        .route(
            "/api/prospects/:id",
            put(handlers::prospects::update_prospect),
        )
        .route(
            "/api/prospects/:id",
            delete(handlers::prospects::delete_prospect),
        )
        .route(
            "/api/prospects/:id/timeline",
            get(handlers::interactions::prospect_timeline),
        )
        // Import/Export
        .route(
            "/api/prospects/import",
            post(handlers::import_export::import_csv),
        )
        .route(
            "/api/prospects/export/csv",
            get(handlers::import_export::export_csv),
        )
        .route(
            "/api/prospects/export/json",
            get(handlers::import_export::export_json),
        )
        // Interactions
        .route(
            "/api/interactions",
            get(handlers::interactions::list_interactions),
        )
        .route(
            "/api/interactions",
            post(handlers::interactions::create_interaction),
        )
        // Pipeline
        .route("/api/pipeline", get(handlers::pipeline::get_pipeline))
        .route(
            "/api/pipeline/move",
            post(handlers::pipeline::move_prospect_stage),
        )
        .route(
            "/api/pipeline/metrics",
            get(handlers::pipeline::pipeline_metrics),
        )
        .route(
            "/api/pipeline/history/:prospect_id",
            get(handlers::pipeline::pipeline_history),
        )
        .route(
            "/api/pipeline/stages",
            get(handlers::pipeline::list_stages),
        )
        // Scoring
        .route(
            "/api/scoring/calculate/:prospect_id",
            post(handlers::scoring::calculate_score),
        )
        .route(
            "/api/scoring/recalculate-all",
            post(handlers::scoring::recalculate_all),
        )
        .route(
            "/api/scoring/criteria",
            get(handlers::scoring::list_criteria),
        )
        .route(
            "/api/scoring/criteria",
            post(handlers::scoring::create_criteria),
        )
        .route(
            "/api/scoring/criteria/:id",
            delete(handlers::scoring::delete_criteria),
        )
        // AI
        .route("/api/ai/generate", post(handlers::ai::generate_message))
        // Templates
        .route("/api/templates", get(handlers::templates::list_templates))
        .route("/api/templates", post(handlers::templates::create_template))
        .route(
            "/api/templates/:id",
            put(handlers::templates::update_template),
        )
        .route(
            "/api/templates/:id",
            delete(handlers::templates::delete_template),
        )
        // Reminders
        .route("/api/reminders", get(handlers::reminders::list_reminders))
        .route("/api/reminders", post(handlers::reminders::create_reminder))
        .route(
            "/api/reminders/due",
            get(handlers::reminders::due_reminders),
        )
        .route(
            "/api/reminders/:id/complete",
            post(handlers::reminders::complete_reminder),
        )
        .route(
            "/api/reminders/:id",
            delete(handlers::reminders::delete_reminder),
        )
        // Tags
        .route("/api/tags", get(handlers::tags::list_tags))
        .route("/api/tags", post(handlers::tags::create_tag))
        .route("/api/tags/:id", delete(handlers::tags::delete_tag))
        // Dashboard
        .route("/api/dashboard", get(handlers::dashboard::dashboard))
        .layer(middleware::from_fn(auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .with_state(state)
}

async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "b2b-prospector",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
