/*
  Warnings:

  - Made the column `abstract` on table `conferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `topic` on table `conferences` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable (with existence and type checks)
DO $$ 
DECLARE
    col_type_oid OID;
    base_type_oid OID;
    is_array BOOLEAN := FALSE;
BEGIN
    -- Check if conferences table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conferences') THEN
        
        -- Get the type OID of presentationType column
        SELECT a.atttypid INTO col_type_oid
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = 'conferences'
        AND a.attname = 'presentationType';
        
        -- Check if it's an array type
        IF col_type_oid IS NOT NULL THEN
            SELECT t.typelem INTO base_type_oid
            FROM pg_type t
            WHERE t.oid = col_type_oid;
            
            -- If typelem is not null, it's an array type
            is_array := (base_type_oid IS NOT NULL);
        END IF;
        
        -- Only alter if column exists
        IF col_type_oid IS NOT NULL THEN
            -- Check if abstract column exists and is nullable
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'conferences' 
                AND column_name = 'abstract'
                AND is_nullable = 'YES'
            ) THEN
                -- Update NULL values first if any exist
                UPDATE "conferences" SET "abstract" = '' WHERE "abstract" IS NULL;
                ALTER TABLE "conferences" ALTER COLUMN "abstract" SET NOT NULL;
            END IF;
            
            -- Handle presentationType conversion based on current type
            IF is_array THEN
                -- It's an array type, convert to single enum
                BEGIN
                    ALTER TABLE "conferences"
                        ALTER COLUMN "presentationType" SET DATA TYPE "PRESENTATION_TYPE" 
                        USING COALESCE(("presentationType"::text[])[1]::"PRESENTATION_TYPE", 'ORAL'::"PRESENTATION_TYPE");
                EXCEPTION WHEN OTHERS THEN
                    -- If conversion fails, set to default
                    ALTER TABLE "conferences"
                        ALTER COLUMN "presentationType" SET DATA TYPE "PRESENTATION_TYPE" 
                        USING 'ORAL'::"PRESENTATION_TYPE";
                END;
            END IF;
            
            -- Ensure presentationType is NOT NULL if it's nullable
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'conferences' 
                AND column_name = 'presentationType'
                AND is_nullable = 'YES'
            ) THEN
                -- Update NULL values first
                UPDATE "conferences" SET "presentationType" = 'ORAL'::"PRESENTATION_TYPE" WHERE "presentationType" IS NULL;
                ALTER TABLE "conferences" ALTER COLUMN "presentationType" SET NOT NULL;
            END IF;
            
            -- Handle topic column
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'conferences' 
                AND column_name = 'topic'
                AND is_nullable = 'YES'
            ) THEN
                -- Update NULL values first
                UPDATE "conferences" SET "topic" = 'SUFI_PHILOSOPHY'::"CONFERENCE_TYPE" WHERE "topic" IS NULL;
                ALTER TABLE "conferences" ALTER COLUMN "topic" SET NOT NULL;
            END IF;
        END IF;
    END IF;
END $$;
