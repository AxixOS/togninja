# AI Agent System

This directory contains the multi-studio AI operator system for the photography CRM.

## Structure

- `core/` - Core types, policies, and OpenAI integration
- `integrations/` - External service integrations (Supabase, SMTP, Stripe)
- `tools/` - AI agent tools for CRM operations
- `prompts/` - System prompts and response styles
- `util/` - Utility functions and helpers
- `data/` - Agent data and temporary files
- `scripts/` - Helper scripts for agent operations

## Usage

The agent system is designed to be:
- Multi-tenant (studio-specific)
- Guardrailed (policy-based permissions)
- Auditable (all actions logged)
- Extensible (new tools can be added)

## Current Phase

Phase A: Read-Only AI Operator
- Can read CRM data
- Can draft emails
- Cannot modify data without approval