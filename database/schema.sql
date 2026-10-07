-- =====================================================================
--  CLYVO - Estrutura inicial do banco de dados
--  "Transforme conversas em vendas."
--
--  Banco.......: MySQL 5.7+ / MariaDB 10.4+ (WAMP Server)
--  Engine......: InnoDB (necessario para chaves estrangeiras)
--  Charset.....: utf8mb4 / utf8mb4_unicode_ci (suporta acentos e emoji)
--
--  COMO EXECUTAR
--    a) phpMyAdmin  -> aba "Importar" -> selecione este arquivo
--    b) Linha de comando:
--         mysql -u root -p < schema.sql
--    c) Pelo backend:
--         npm run db:migrate
--
--  REGRA DE OURO DO ISOLAMENTO DE DADOS
--    Toda tabela de dados do usuario possui a coluna `user_id`.
--    Nenhuma consulta da API pode rodar sem o filtro `user_id = ?`.
--    As FKs usam ON DELETE CASCADE a partir de `users`, portanto excluir
--    uma conta remove todos os dados dela.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';

CREATE DATABASE IF NOT EXISTS `clyvo`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `clyvo`;

-- =====================================================================
-- 1. USERS - contas de acesso ao Clyvo
-- =====================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                  VARCHAR(120)    NOT NULL,
  `email`                 VARCHAR(160)    NOT NULL,
  `password_hash`         VARCHAR(255)    NOT NULL,
  `phone`                 VARCHAR(20)     DEFAULT NULL,
  `whatsapp`              VARCHAR(20)     DEFAULT NULL,
  `avatar_url`            VARCHAR(255)    DEFAULT NULL,

  -- Respostas do onboarding (personalizam o dashboard)
  `sells_type`            ENUM('servicos','produtos','servicos_e_produtos','vendedor','loja','outro') DEFAULT NULL,
  `main_goal`             ENUM('organizar_clientes','criar_orcamentos','acompanhar_vendas','nao_esquecer_clientes','aumentar_vendas','organizar_empresa') DEFAULT NULL,
  `onboarding_completed`  TINYINT(1)      NOT NULL DEFAULT 0,

  `status`                ENUM('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
  `email_verified_at`     DATETIME        DEFAULT NULL,
  `last_login_at`         DATETIME        DEFAULT NULL,

  `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`            DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. COMPANIES - perfil da empresa (1:1 com users)
--    Usado no cabecalho das propostas e dos PDFs.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `companies` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `legal_name`    VARCHAR(160)    DEFAULT NULL,
  `trade_name`    VARCHAR(160)    DEFAULT NULL,
  `document`      VARCHAR(20)     DEFAULT NULL COMMENT 'CPF ou CNPJ (somente digitos)',
  `phone`         VARCHAR(20)     DEFAULT NULL,
  `whatsapp`      VARCHAR(20)     DEFAULT NULL,
  `email`         VARCHAR(160)    DEFAULT NULL,
  `logo_url`      VARCHAR(255)    DEFAULT NULL,
  `zip_code`      VARCHAR(10)     DEFAULT NULL,
  `street`        VARCHAR(160)    DEFAULT NULL,
  `number`        VARCHAR(20)     DEFAULT NULL,
  `complement`    VARCHAR(120)    DEFAULT NULL,
  `district`      VARCHAR(120)    DEFAULT NULL,
  `city`          VARCHAR(120)    DEFAULT NULL,
  `state`         CHAR(2)         DEFAULT NULL,
  `instagram`     VARCHAR(120)    DEFAULT NULL,
  `website`       VARCHAR(160)    DEFAULT NULL,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_companies_user` (`user_id`),
  CONSTRAINT `fk_companies_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. SETTINGS - preferencias do usuario (1:1 com users)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                BIGINT UNSIGNED NOT NULL,
  `currency`               CHAR(3)         NOT NULL DEFAULT 'BRL',
  `locale`                 VARCHAR(10)     NOT NULL DEFAULT 'pt-BR',
  `timezone`               VARCHAR(64)     NOT NULL DEFAULT 'America/Sao_Paulo',
  `follow_up_days`         SMALLINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'Dias sem resposta para alertar o usuario',
  `quote_validity_days`    SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  `default_warranty_days`  SMALLINT UNSIGNED DEFAULT 90,
  `notifications_enabled`  TINYINT(1)      NOT NULL DEFAULT 1,
  `whatsapp_signature`     VARCHAR(255)    DEFAULT NULL,
  `theme`                  ENUM('claro','escuro','sistema') NOT NULL DEFAULT 'sistema',
  `created_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_user` (`user_id`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. REFRESH_TOKENS - sessoes ativas
--    Guardamos apenas o HASH do token. Vazamento do banco nao permite login.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `token_id`    CHAR(36)        NOT NULL COMMENT 'claim jti do JWT',
  `token_hash`  CHAR(64)        NOT NULL COMMENT 'SHA-256 do refresh token',
  `expires_at`  DATETIME        NOT NULL,
  `revoked_at`  DATETIME        DEFAULT NULL,
  `user_agent`  VARCHAR(255)    DEFAULT NULL,
  `ip_address`  VARCHAR(45)     DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_tokens_token_id` (`token_id`),
  KEY `idx_refresh_tokens_user` (`user_id`, `revoked_at`),
  KEY `idx_refresh_tokens_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. PASSWORD_RESET_TOKENS - recuperacao de senha
-- =====================================================================
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `token_hash`  CHAR(64)        NOT NULL,
  `expires_at`  DATETIME        NOT NULL,
  `used_at`     DATETIME        DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_hash` (`token_hash`),
  KEY `idx_password_reset_user` (`user_id`, `used_at`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. PLANS - catalogo de planos SaaS (tabela global, sem user_id)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `plans` (
  `id`                            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`                          ENUM('free','pro','pro_max') NOT NULL,
  `name`                          VARCHAR(60)     NOT NULL,
  `description`                   VARCHAR(255)    DEFAULT NULL,
  `price`                         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  `founder_price`                 DECIMAL(10,2)   DEFAULT NULL COMMENT 'Preco vitalicio dos primeiros assinantes',
  `founder_slots`                 INT UNSIGNED    DEFAULT NULL COMMENT 'Quantas vagas de fundador existem; NULL = sem oferta',
  `billing_period`                ENUM('gratuito','mensal','anual') NOT NULL DEFAULT 'mensal',
  `max_clients`                   INT UNSIGNED    DEFAULT NULL COMMENT 'NULL = ilimitado',
  `max_opportunities_per_month`   INT UNSIGNED    DEFAULT NULL COMMENT 'NULL = ilimitado',
  `max_quotes_per_month`          INT UNSIGNED    DEFAULT NULL COMMENT 'NULL = ilimitado',
  `max_catalog_items`             INT UNSIGNED    DEFAULT NULL COMMENT 'NULL = ilimitado',
  `has_custom_pdf`                TINYINT(1)      NOT NULL DEFAULT 0,
  `has_statistics`                TINYINT(1)      NOT NULL DEFAULT 0,
  `has_follow_ups`                TINYINT(1)      NOT NULL DEFAULT 0,
  `has_ai`                        TINYINT(1)      NOT NULL DEFAULT 0,
  `has_team`                      TINYINT(1)      NOT NULL DEFAULT 0,
  `is_active`                     TINYINT(1)      NOT NULL DEFAULT 1,
  `sort_order`                    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`                    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plans_code` (`code`),
  KEY `idx_plans_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. SUBSCRIPTIONS - assinatura do usuario
--    Pagamento real sera integrado na Etapa 15.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                   BIGINT UNSIGNED NOT NULL,
  `plan_id`                   BIGINT UNSIGNED NOT NULL,
  `status`                    ENUM('trialing','ativa','inadimplente','cancelada','expirada') NOT NULL DEFAULT 'ativa',
  `is_founder`                TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Entrou na oferta de fundador; mantem o preco',
  `price_paid`                DECIMAL(10,2)   DEFAULT NULL COMMENT 'Valor travado na contratacao',
  `started_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `current_period_start`      DATETIME        DEFAULT NULL,
  `current_period_end`        DATETIME        DEFAULT NULL,
  `trial_ends_at`             DATETIME        DEFAULT NULL,
  `canceled_at`               DATETIME        DEFAULT NULL,
  `external_provider`         VARCHAR(40)     DEFAULT NULL COMMENT 'stripe, mercadopago, ...',
  `external_subscription_id`  VARCHAR(120)    DEFAULT NULL,
  `created_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_subscriptions_user_status` (`user_id`, `status`),
  KEY `idx_subscriptions_plan` (`plan_id`),
  KEY `idx_subscriptions_external` (`external_provider`, `external_subscription_id`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 8. PAYMENTS - historico de cobrancas (preparado para gateway futuro)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`               BIGINT UNSIGNED NOT NULL,
  `subscription_id`       BIGINT UNSIGNED DEFAULT NULL,
  `amount`                DECIMAL(10,2)   NOT NULL,
  `currency`              CHAR(3)         NOT NULL DEFAULT 'BRL',
  `status`                ENUM('pendente','pago','falhou','estornado') NOT NULL DEFAULT 'pendente',
  `method`                VARCHAR(40)     DEFAULT NULL COMMENT 'pix, cartao, boleto, ...',
  `external_provider`     VARCHAR(40)     DEFAULT NULL,
  `external_payment_id`   VARCHAR(120)    DEFAULT NULL,
  `paid_at`               DATETIME        DEFAULT NULL,
  `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_payments_user` (`user_id`, `status`),
  KEY `idx_payments_subscription` (`subscription_id`),
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 9. CLIENTS - carteira de clientes do usuario
-- =====================================================================
CREATE TABLE IF NOT EXISTS `clients` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `name`             VARCHAR(140)    NOT NULL,
  `phone`            VARCHAR(20)     DEFAULT NULL,
  `whatsapp`         VARCHAR(20)     DEFAULT NULL,
  `email`            VARCHAR(160)    DEFAULT NULL,
  `document`         VARCHAR(20)     DEFAULT NULL COMMENT 'CPF ou CNPJ (opcional)',
  `zip_code`         VARCHAR(10)     DEFAULT NULL,
  `street`           VARCHAR(160)    DEFAULT NULL,
  `number`           VARCHAR(20)     DEFAULT NULL,
  `complement`       VARCHAR(120)    DEFAULT NULL,
  `district`         VARCHAR(120)    DEFAULT NULL,
  `city`             VARCHAR(120)    DEFAULT NULL,
  `state`            CHAR(2)         DEFAULT NULL,
  `notes`            TEXT            DEFAULT NULL,
  `origin`           VARCHAR(60)     DEFAULT NULL COMMENT 'whatsapp, indicacao, instagram, ...',

  -- Metricas denormalizadas (atualizadas ao registrar uma venda)
  `total_purchased`  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `purchases_count`  INT UNSIGNED    NOT NULL DEFAULT 0,
  `last_contact_at`  DATETIME        DEFAULT NULL,

  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`       DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_clients_user_name` (`user_id`, `name`),
  KEY `idx_clients_user_phone` (`user_id`, `phone`),
  KEY `idx_clients_user_email` (`user_id`, `email`),
  KEY `idx_clients_user_deleted` (`user_id`, `deleted_at`),
  KEY `idx_clients_last_contact` (`user_id`, `last_contact_at`),
  CONSTRAINT `fk_clients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 10. CATEGORIES - categorias de produtos e servicos
-- =====================================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `type`        ENUM('produto','servico') NOT NULL,
  `name`        VARCHAR(80)     NOT NULL,
  `color`       CHAR(7)         DEFAULT NULL COMMENT 'Hex, ex: #FF7A2F',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_user_type_name` (`user_id`, `type`, `name`),
  CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11. PRODUCTS - catalogo de produtos
-- =====================================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `category_id`   BIGINT UNSIGNED DEFAULT NULL,
  `name`          VARCHAR(140)    NOT NULL,
  `description`   TEXT            DEFAULT NULL,
  `sku`           VARCHAR(60)     DEFAULT NULL COMMENT 'Codigo interno / SKU',
  `price`         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `promo_price`   DECIMAL(12,2)   DEFAULT NULL,
  `cost_price`    DECIMAL(12,2)   DEFAULT NULL,
  `track_stock`   TINYINT(1)      NOT NULL DEFAULT 0,
  `stock`         INT             NOT NULL DEFAULT 0,
  `photo_url`     VARCHAR(255)    DEFAULT NULL,
  `notes`         TEXT            DEFAULT NULL,
  `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`    DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_user_sku` (`user_id`, `sku`),
  KEY `idx_products_user_name` (`user_id`, `name`),
  KEY `idx_products_user_active` (`user_id`, `is_active`, `deleted_at`),
  KEY `idx_products_category` (`category_id`),
  CONSTRAINT `fk_products_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ck_products_price` CHECK (`price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 12. SERVICES - catalogo de servicos
-- =====================================================================
CREATE TABLE IF NOT EXISTS `services` (
  `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                 BIGINT UNSIGNED NOT NULL,
  `category_id`             BIGINT UNSIGNED DEFAULT NULL,
  `name`                    VARCHAR(140)    NOT NULL,
  `description`             TEXT            DEFAULT NULL,
  `price`                   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `estimated_time_minutes`  INT UNSIGNED    DEFAULT NULL,
  `warranty_days`           SMALLINT UNSIGNED DEFAULT NULL,
  `notes`                   TEXT            DEFAULT NULL,
  `is_active`               TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`              DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_services_user_name` (`user_id`, `name`),
  KEY `idx_services_user_active` (`user_id`, `is_active`, `deleted_at`),
  KEY `idx_services_category` (`category_id`),
  CONSTRAINT `fk_services_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ck_services_price` CHECK (`price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 13. OPPORTUNITIES - pipeline de vendas
-- =====================================================================
CREATE TABLE IF NOT EXISTS `opportunities` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`              BIGINT UNSIGNED NOT NULL,
  `client_id`            BIGINT UNSIGNED NOT NULL,
  `title`                VARCHAR(160)    NOT NULL,
  `description`          TEXT            DEFAULT NULL,
  `status`               ENUM('novo_contato','proposta_enviada','negociacao','aguardando_pagamento','fechado','perdido') NOT NULL DEFAULT 'novo_contato',
  `source`               VARCHAR(60)     DEFAULT NULL,
  `total_amount`         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `expected_close_date`  DATE            DEFAULT NULL,
  `last_contact_at`      DATETIME        DEFAULT NULL,
  `closed_at`            DATETIME        DEFAULT NULL,
  `lost_reason`          VARCHAR(255)    DEFAULT NULL,
  `created_at`           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`           DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_opportunities_user_status` (`user_id`, `status`, `deleted_at`),
  KEY `idx_opportunities_client` (`client_id`),
  KEY `idx_opportunities_last_contact` (`user_id`, `last_contact_at`),
  KEY `idx_opportunities_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_opportunities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_opportunities_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 14. OPPORTUNITY_STATUS_HISTORY - auditoria do pipeline
-- =====================================================================
CREATE TABLE IF NOT EXISTS `opportunity_status_history` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `opportunity_id`  BIGINT UNSIGNED NOT NULL,
  `from_status`     ENUM('novo_contato','proposta_enviada','negociacao','aguardando_pagamento','fechado','perdido') DEFAULT NULL,
  `to_status`       ENUM('novo_contato','proposta_enviada','negociacao','aguardando_pagamento','fechado','perdido') NOT NULL,
  `note`            VARCHAR(255)    DEFAULT NULL,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_opp_history_opportunity` (`opportunity_id`, `created_at`),
  KEY `idx_opp_history_user` (`user_id`),
  CONSTRAINT `fk_opp_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_opp_history_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 15. QUOTES - orcamentos e propostas
-- =====================================================================
CREATE TABLE IF NOT EXISTS `quotes` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `client_id`        BIGINT UNSIGNED NOT NULL,
  `opportunity_id`   BIGINT UNSIGNED DEFAULT NULL,
  `type`             ENUM('orcamento','proposta') NOT NULL DEFAULT 'orcamento',
  `number`           INT UNSIGNED    NOT NULL COMMENT 'Sequencial por usuario: #0104',
  `status`           ENUM('rascunho','enviado','visualizado','aceito','recusado','expirado','cancelado') NOT NULL DEFAULT 'rascunho',
  `subtotal`         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `discount_type`    ENUM('valor','percentual') NOT NULL DEFAULT 'valor',
  `discount_amount`  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `total`            DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `delivery_time`    VARCHAR(80)     DEFAULT NULL COMMENT 'Ex: 2 dias',
  `warranty`         VARCHAR(80)     DEFAULT NULL COMMENT 'Ex: 90 dias',
  `payment_methods`  VARCHAR(160)    DEFAULT NULL COMMENT 'Ex: Pix / cartao / dinheiro',
  `valid_until`      DATE            DEFAULT NULL,
  `notes`            TEXT            DEFAULT NULL,
  `pdf_url`          VARCHAR(255)    DEFAULT NULL,
  `sent_at`          DATETIME        DEFAULT NULL,
  `viewed_at`        DATETIME        DEFAULT NULL,
  `accepted_at`      DATETIME        DEFAULT NULL,
  `rejected_at`      DATETIME        DEFAULT NULL,
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`       DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quotes_user_number` (`user_id`, `number`),
  KEY `idx_quotes_user_status` (`user_id`, `status`, `deleted_at`),
  KEY `idx_quotes_client` (`client_id`),
  KEY `idx_quotes_opportunity` (`opportunity_id`),
  KEY `idx_quotes_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_quotes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_quotes_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_quotes_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 16. QUOTE_ITEMS - itens do orcamento/proposta
--     item_type = 'avulso' permite item digitado na hora (sem catalogo).
-- =====================================================================
CREATE TABLE IF NOT EXISTS `quote_items` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `quote_id`     BIGINT UNSIGNED NOT NULL,
  `item_type`    ENUM('produto','servico','avulso') NOT NULL DEFAULT 'avulso',
  `product_id`   BIGINT UNSIGNED DEFAULT NULL,
  `service_id`   BIGINT UNSIGNED DEFAULT NULL,
  `description`  VARCHAR(255)    NOT NULL COMMENT 'Congelado no momento da criacao',
  `quantity`     DECIMAL(10,3)   NOT NULL DEFAULT 1.000,
  `unit_price`   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `discount`     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `total`        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `sort_order`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_quote_items_quote` (`quote_id`, `sort_order`),
  KEY `idx_quote_items_user` (`user_id`),
  KEY `idx_quote_items_product` (`product_id`),
  KEY `idx_quote_items_service` (`service_id`),
  CONSTRAINT `fk_quote_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_quote_items_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_quote_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_quote_items_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ck_quote_items_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 17. QUOTE_STATUS_HISTORY - auditoria das propostas
-- =====================================================================
CREATE TABLE IF NOT EXISTS `quote_status_history` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `quote_id`     BIGINT UNSIGNED NOT NULL,
  `from_status`  ENUM('rascunho','enviado','visualizado','aceito','recusado','expirado','cancelado') DEFAULT NULL,
  `to_status`    ENUM('rascunho','enviado','visualizado','aceito','recusado','expirado','cancelado') NOT NULL,
  `note`         VARCHAR(255)    DEFAULT NULL,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_quote_history_quote` (`quote_id`, `created_at`),
  KEY `idx_quote_history_user` (`user_id`),
  CONSTRAINT `fk_quote_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_quote_history_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 18. SALES - vendas fechadas (base das estatisticas e do faturamento)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `sales` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `client_id`       BIGINT UNSIGNED NOT NULL,
  `opportunity_id`  BIGINT UNSIGNED DEFAULT NULL,
  `quote_id`        BIGINT UNSIGNED DEFAULT NULL,
  `description`     VARCHAR(255)    DEFAULT NULL,
  `amount`          DECIMAL(12,2)   NOT NULL,
  `payment_method`  VARCHAR(40)     DEFAULT NULL,
  `sold_at`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes`           TEXT            DEFAULT NULL,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME        DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_sales_user_date` (`user_id`, `sold_at`, `deleted_at`),
  KEY `idx_sales_client` (`client_id`),
  KEY `idx_sales_opportunity` (`opportunity_id`),
  KEY `idx_sales_quote` (`quote_id`),
  CONSTRAINT `fk_sales_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 19. FOLLOW_UPS - lembretes, recuperacao de cliente e pos-venda
-- =====================================================================
CREATE TABLE IF NOT EXISTS `follow_ups` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `client_id`       BIGINT UNSIGNED DEFAULT NULL,
  `opportunity_id`  BIGINT UNSIGNED DEFAULT NULL,
  `quote_id`        BIGINT UNSIGNED DEFAULT NULL,
  `type`            ENUM('contato','retorno','recuperacao','pos_venda','garantia','outro') NOT NULL DEFAULT 'contato',
  `title`           VARCHAR(160)    NOT NULL,
  `notes`           TEXT            DEFAULT NULL,
  `due_date`        DATE            NOT NULL,
  `status`          ENUM('pendente','concluido','adiado','sem_resposta','cliente_fechou','cliente_recusou','cancelado') NOT NULL DEFAULT 'pendente',
  `completed_at`    DATETIME        DEFAULT NULL,
  `snoozed_until`   DATE            DEFAULT NULL,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_follow_ups_user_due` (`user_id`, `status`, `due_date`),
  KEY `idx_follow_ups_client` (`client_id`),
  KEY `idx_follow_ups_opportunity` (`opportunity_id`),
  KEY `idx_follow_ups_quote` (`quote_id`),
  CONSTRAINT `fk_follow_ups_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_follow_ups_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_follow_ups_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_follow_ups_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 20. NOTIFICATIONS - avisos exibidos no app
-- =====================================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `type`        VARCHAR(60)     NOT NULL COMMENT 'follow_up, sem_resposta, garantia, venda, sistema',
  `title`       VARCHAR(160)    NOT NULL,
  `message`     VARCHAR(500)    NOT NULL,
  `payload`     JSON            DEFAULT NULL COMMENT 'Dados extras: {"opportunityId":12}',
  `action_url`  VARCHAR(255)    DEFAULT NULL,
  `read_at`     DATETIME        DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`, `read_at`, `created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 21. SCHEMA_MIGRATIONS - controle de versao do banco
-- =====================================================================
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `version`     VARCHAR(60)  NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `applied_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schema_migrations_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- DADOS BASE - planos SaaS (nao dependem de usuario)
-- =====================================================================
INSERT INTO `plans`
  (`code`, `name`, `description`, `price`, `founder_price`, `founder_slots`, `billing_period`,
   `max_clients`, `max_opportunities_per_month`, `max_quotes_per_month`, `max_catalog_items`,
   `has_custom_pdf`, `has_statistics`, `has_follow_ups`, `has_ai`, `has_team`, `is_active`, `sort_order`)
VALUES
  ('free', 'Free', 'Organize seus clientes e veja o Clyvo funcionando.', 0.00, NULL, NULL, 'gratuito',
   5, 20, 5, 10, 0, 0, 1, 1, 0, 1, 1),
  ('pro', 'Pro', 'Para quem vende sozinho e nao quer perder nenhuma venda.', 14.99, NULL, NULL, 'mensal',
   100, 200, 100, 100, 1, 1, 1, 1, 0, 1, 2),
  ('pro_max', 'Pro Plus', 'Mais capacidade para organizar seu negocio e usar a Cly.', 30.99, NULL, NULL, 'mensal',
   500, 600, 300, 500, 1, 1, 1, 1, 0, 1, 3)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `price` = VALUES(`price`),
  `founder_price` = VALUES(`founder_price`),
  `founder_slots` = VALUES(`founder_slots`),
  `billing_period` = VALUES(`billing_period`),
  `max_clients` = VALUES(`max_clients`),
  `max_opportunities_per_month` = VALUES(`max_opportunities_per_month`),
  `max_quotes_per_month` = VALUES(`max_quotes_per_month`),
  `max_catalog_items` = VALUES(`max_catalog_items`),
  `has_custom_pdf` = VALUES(`has_custom_pdf`),
  `has_statistics` = VALUES(`has_statistics`),
  `has_follow_ups` = VALUES(`has_follow_ups`),
  `has_ai` = VALUES(`has_ai`),
  `has_team` = VALUES(`has_team`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`);

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('2025_01_01_000002_planos_e_preco_de_fundador', 'Estrutura completa + precos Pro 14,90 / Pro Max 29,90 com oferta de fundador')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- FIM DO SCHEMA
-- =====================================================================

CREATE TABLE IF NOT EXISTS cly_usage (
 user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 consent_version VARCHAR(30) DEFAULT NULL,
 consent_at DATETIME(3) DEFAULT NULL,
 month_key CHAR(7) NOT NULL DEFAULT '',
 monthly_used INT UNSIGNED NOT NULL DEFAULT 0,
 round_used INT UNSIGNED NOT NULL DEFAULT 0,
 level INT UNSIGNED NOT NULL DEFAULT 0,
 blocked_until DATETIME(3) DEFAULT NULL,
 last_exhausted_at DATETIME(3) DEFAULT NULL,
 lease_token VARCHAR(36) DEFAULT NULL,
 lease_until DATETIME(3) DEFAULT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS billing_accounts (
 user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 app_user_id CHAR(36) NOT NULL UNIQUE,
 checked_at DATETIME(3) DEFAULT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS session_security (
 user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 version INT UNSIGNED NOT NULL DEFAULT 0,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
