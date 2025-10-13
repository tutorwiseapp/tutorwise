// src/db-connector.ts
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';

// In a real implementation, these would be securely provided by the Engineer Agent.
const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING;
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

export const getPostgresClient = () => {
  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL_NON_POOLING is not defined in the environment.');
  }
  return new Pool({ connectionString: POSTGRES_URL });
};

export const getNeo4jDriver = () => {
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
    throw new Error('Neo4j credentials are not defined in the environment.');
  }
  return neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
};
