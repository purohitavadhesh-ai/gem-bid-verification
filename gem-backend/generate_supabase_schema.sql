"""
SQL schema migration script for Supabase SQL Editor.
Run this script inside Supabase SQL Editor to instantly create all tables!
"""

CREATE_TABLES_SQL = """
-- Drop existing tables if re-running
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS contradictions CASCADE;
DROP TABLE IF EXISTS verdicts CASCADE;
DROP TABLE IF EXISTS bidder_facts CASCADE;
DROP TABLE IF EXISTS requirements CASCADE;
DROP TABLE IF EXISTS bidder_documents CASCADE;
DROP TABLE IF EXISTS bidders CASCADE;
DROP TABLE IF EXISTS tender_documents CASCADE;
DROP TABLE IF EXISTS tenders CASCADE;

-- 1. Tenders
CREATE TABLE tenders (
    id SERIAL PRIMARY KEY,
    display_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tender Documents
CREATE TABLE tender_documents (
    id SERIAL PRIMARY KEY,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    status VARCHAR(50) DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bidders
CREATE TABLE bidders (
    id SERIAL PRIMARY KEY,
    display_id VARCHAR(50) NOT NULL,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    score INT DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'Low',
    status VARCHAR(50) DEFAULT 'Under Review',
    gem_bid_ref VARCHAR(100),
    bid_value VARCHAR(100),
    subtitle TEXT,
    submitted_ago VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bidder Documents
CREATE TABLE bidder_documents (
    id SERIAL PRIMARY KEY,
    bidder_id INT REFERENCES bidders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    doc_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Requirements
CREATE TABLE requirements (
    id SERIAL PRIMARY KEY,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    is_mandatory BOOLEAN DEFAULT TRUE,
    requirement_type VARCHAR(50) DEFAULT 'exact_match',
    target_value VARCHAR(255),
    comparison_operator VARCHAR(20) DEFAULT '==',
    source_page INT,
    raw_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bidder Facts
CREATE TABLE bidder_facts (
    id SERIAL PRIMARY KEY,
    bidder_id INT REFERENCES bidders(id) ON DELETE CASCADE,
    fact_key VARCHAR(100) NOT NULL,
    extracted_value TEXT,
    confidence_score FLOAT DEFAULT 1.0,
    source_doc_name VARCHAR(255),
    source_page INT,
    snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Verdicts
CREATE TABLE verdicts (
    id SERIAL PRIMARY KEY,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    bidder_id INT REFERENCES bidders(id) ON DELETE CASCADE,
    requirement_id INT REFERENCES requirements(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING',
    evidence_doc_name VARCHAR(255),
    evidence_page INT,
    evidence_snippet TEXT,
    evidence_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Contradictions
CREATE TABLE contradictions (
    id SERIAL PRIMARY KEY,
    bidder_id INT REFERENCES bidders(id) ON DELETE CASCADE,
    fact_key VARCHAR(100) NOT NULL,
    description TEXT,
    value_a TEXT,
    source_doc_a VARCHAR(255),
    source_page_a INT,
    value_b TEXT,
    source_doc_b VARCHAR(255),
    source_page_b INT,
    severity VARCHAR(50) DEFAULT 'High',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    tender_id VARCHAR(50),
    performed_by VARCHAR(100) NOT NULL,
    details TEXT
);
"""

if __name__ == "__main__":
    print("Copy and paste the SQL script below into Supabase SQL Editor:")
    print("=" * 60)
    print(CREATE_TABLES_SQL)
    print("=" * 60)
