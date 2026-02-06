use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::template::GeneratedMessage;

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
}

#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
}

#[derive(Deserialize)]
struct ContentBlock {
    text: Option<String>,
}

pub async fn generate_message(
    pool: &PgPool,
    api_key: &str,
    prospect_id: Uuid,
    template_id: Option<Uuid>,
    message_type: &str,
    tone: &str,
    additional_context: Option<&str>,
) -> AppResult<GeneratedMessage> {
    if api_key.is_empty() {
        return Err(AppError::BadRequest(
            "Anthropic API key not configured".into(),
        ));
    }

    // Fetch prospect data
    let prospect = sqlx::query(
        r#"SELECT company_name, contact_name, contact_title, email, industry,
                  company_size, country, city, notes, score_label
           FROM prospects WHERE id = $1"#,
    )
    .bind(prospect_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Prospect not found".into()))?;

    let company_name: String = prospect.try_get("company_name").unwrap_or_default();
    let contact_name: String = prospect.try_get("contact_name").unwrap_or_default();
    let contact_title: Option<String> = prospect.try_get("contact_title").ok();
    let industry: Option<String> = prospect.try_get("industry").ok();
    let company_size: Option<String> = prospect.try_get("company_size").ok();
    let country: Option<String> = prospect.try_get("country").ok();
    let city: Option<String> = prospect.try_get("city").ok();
    let notes: Option<String> = prospect.try_get("notes").ok();
    let score_label: String = prospect.try_get("score_label").unwrap_or_default();

    // Fetch recent interactions
    let interactions = sqlx::query(
        r#"SELECT interaction_type, subject, body, outcome, created_at
           FROM interactions WHERE prospect_id = $1
           ORDER BY created_at DESC LIMIT 5"#,
    )
    .bind(prospect_id)
    .fetch_all(pool)
    .await?;

    // Fetch template if provided
    let template_content: Option<String> = if let Some(tid) = template_id {
        sqlx::query_scalar("SELECT body_template FROM ai_templates WHERE id = $1")
            .bind(tid)
            .fetch_optional(pool)
            .await?
    } else {
        None
    };

    // Build interaction history
    let interaction_history = if interactions.is_empty() {
        "No previous interactions".to_string()
    } else {
        interactions
            .iter()
            .map(|i| {
                let itype: String = i.try_get("interaction_type").unwrap_or_default();
                let created: chrono::DateTime<chrono::Utc> = i.try_get("created_at").unwrap();
                let subject: Option<String> = i.try_get("subject").ok();
                let outcome: Option<String> = i.try_get("outcome").ok();
                format!(
                    "- {} ({}): {} {}",
                    itype,
                    created.format("%Y-%m-%d"),
                    subject.as_deref().unwrap_or(""),
                    outcome.as_deref().unwrap_or("")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let tone_instruction = match tone {
        "casual" => "Use a friendly, approachable, casual tone. Be conversational.",
        "consultive" => "Use a consultative, advisory tone. Position yourself as an expert who can help solve their problems.",
        _ => "Use a professional, formal tone. Be respectful and business-oriented.",
    };

    let type_instruction = match message_type {
        "follow_up" => "Write a follow-up email based on the previous interactions. Reference specific points from past conversations.",
        "proposal" => "Write a proposal or value proposition email. Focus on how you can solve their specific problems.",
        "closing" => "Write a closing email to push the deal forward. Create urgency and summarize the value proposition.",
        _ => "Write a first contact / cold outreach email. Make it personalized and relevant to their industry and role.",
    };

    let template_instruction = template_content
        .map(|t| format!("\nUse this template as a base structure:\n{}", t))
        .unwrap_or_default();

    let additional = additional_context
        .map(|c| format!("\nAdditional context from the seller: {}", c))
        .unwrap_or_default();

    let prompt = format!(
        r#"You are a B2B sales expert. Generate a sales email.

PROSPECT INFO:
- Name: {}
- Title: {}
- Company: {}
- Industry: {}
- Company size: {}
- Location: {}, {}
- Lead temperature: {}
- Notes: {}

INTERACTION HISTORY:
{}

INSTRUCTIONS:
{}
{}
{}{}

Return ONLY a JSON object with these fields:
- "subject": the email subject line
- "body": the email body (use \n for line breaks, no HTML)

Do not include any other text outside the JSON."#,
        contact_name,
        contact_title.as_deref().unwrap_or("Unknown"),
        company_name,
        industry.as_deref().unwrap_or("Unknown"),
        company_size.as_deref().unwrap_or("Unknown"),
        city.as_deref().unwrap_or("Unknown"),
        country.as_deref().unwrap_or("Unknown"),
        score_label,
        notes.as_deref().unwrap_or("None"),
        interaction_history,
        type_instruction,
        tone_instruction,
        template_instruction,
        additional
    );

    let client = Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&AnthropicRequest {
            model: "claude-sonnet-4-5-20250929".to_string(),
            max_tokens: 1024,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: prompt,
            }],
        })
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Anthropic API error: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!(
            "Anthropic API returned {}: {}",
            status,
            body
        )));
    }

    let api_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to parse API response: {}", e)))?;

    let text = api_response
        .content
        .first()
        .and_then(|b| b.text.as_ref())
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("Empty response from API")))?;

    let generated: serde_json::Value = serde_json::from_str(text)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to parse generated JSON: {}. Raw: {}", e, text)))?;

    Ok(GeneratedMessage {
        subject: generated["subject"]
            .as_str()
            .unwrap_or("Follow up")
            .to_string(),
        body: generated["body"]
            .as_str()
            .unwrap_or("Error generating message")
            .to_string(),
        prospect_name: contact_name,
        company_name,
    })
}
