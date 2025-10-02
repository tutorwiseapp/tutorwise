#!/bin/bash

# Vercel Environment Variables Sync Script
# Reads from .env.local and generates vercel env add commands
# Usage: ./tools/scripts/sync-env-to-vercel.sh

set -e

ENV_FILE=".env.local"
OUTPUT_FILE="vercel-env-commands.sh"

echo "🔍 Reading environment variables from $ENV_FILE..."

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

echo "#!/bin/bash" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "# Auto-generated Vercel environment sync commands" >> "$OUTPUT_FILE"
echo "# Generated on: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "set -e" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Read .env.local and generate commands
while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi

    # Extract variable name and value
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"

        # Remove surrounding quotes if present
        var_value=$(echo "$var_value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        # Escape special characters for shell
        var_value=$(printf '%s' "$var_value" | sed "s/'/'\\\\''/g")

        # Generate vercel env add command for each environment separately
        echo "echo '✅ Adding $var_name...'" >> "$OUTPUT_FILE"
        echo "echo '$var_value' | vercel env add $var_name production" >> "$OUTPUT_FILE"
        echo "echo '$var_value' | vercel env add $var_name preview" >> "$OUTPUT_FILE"
        echo "echo '$var_value' | vercel env add $var_name development" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done < "$ENV_FILE"

chmod +x "$OUTPUT_FILE"

echo ""
echo "✅ Generated sync commands in: $OUTPUT_FILE"
echo ""
echo "📋 Next steps:"
echo "   1. Run: vercel login"
echo "   2. Run: vercel whoami (verify you're using the correct account)"
echo "   3. Run: ./$OUTPUT_FILE (to sync all variables)"
echo ""
echo "⚠️  Note: This will add variables to ALL environments (development, preview, production)."
