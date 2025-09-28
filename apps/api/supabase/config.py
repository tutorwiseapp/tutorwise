"""
Supabase configuration for Tutorwise API
"""
import os
from typing import Optional
from supabase import create_client, Client

class SupabaseConfig:
    """Supabase database configuration"""

    def __init__(self):
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")

    def get_client(self) -> Client:
        """Get Supabase client with service role key"""
        if not self.url or not self.key:
            raise ValueError("Supabase URL and service role key must be set")
        return create_client(self.url, self.key)

    def get_public_client(self) -> Client:
        """Get Supabase client with anonymous key for public operations"""
        if not self.url or not self.anon_key:
            raise ValueError("Supabase URL and anonymous key must be set")
        return create_client(self.url, self.anon_key)

# Global instance
supabase_config = SupabaseConfig()