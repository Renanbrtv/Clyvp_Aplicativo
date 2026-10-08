-- Additive and repeatable. Existing content is retained and queued for review.
CREATE TABLE IF NOT EXISTS market_content_reviews (
 target_type VARCHAR(10) NOT NULL,
 target_id BIGINT UNSIGNED NOT NULL,
 owner_id BIGINT UNSIGNED NOT NULL,
 state VARCHAR(12) NOT NULL DEFAULT 'pending',
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 note VARCHAR(450) NOT NULL DEFAULT '',
 moderator_id BIGINT UNSIGNED NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(target_type,target_id),
 KEY idx_market_review_queue(state,updated_at),
 FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(moderator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS market_content_decisions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 target_type VARCHAR(10) NOT NULL, target_id BIGINT UNSIGNED NOT NULL,
 revision INT UNSIGNED NOT NULL, decision VARCHAR(12) NOT NULL,
 note VARCHAR(450) NOT NULL, moderator_id BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(moderator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO market_content_reviews(target_type,target_id,owner_id)
 SELECT 'post',id,owner_id FROM market_posts;
INSERT IGNORE INTO market_content_reviews(target_type,target_id,owner_id)
 SELECT 'profile',user_id,user_id FROM market_profiles;
