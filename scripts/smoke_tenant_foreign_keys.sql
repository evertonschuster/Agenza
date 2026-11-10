\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10s';

DO $smoke$
DECLARE
    tenant_a uuid := gen_random_uuid();
    tenant_b uuid := gen_random_uuid();
    client_a uuid := gen_random_uuid();
    client_b uuid := gen_random_uuid();
    tag_a uuid := gen_random_uuid();
    tag_b uuid := gen_random_uuid();
    scenario record;
    actual_constraint text;
BEGIN
    INSERT INTO services."Clients" ("Id", "TenantId", "FullName", "Status", "CreatedAt")
    VALUES
        (client_a, tenant_a, 'Tenant FK smoke client A', 'Active', now()),
        (client_b, tenant_b, 'Tenant FK smoke client B', 'Active', now());

    INSERT INTO services."Tags" ("Id", "TenantId", "Name", "Color", "CreatedAt")
    VALUES
        (tag_a, tenant_a, 'Tenant FK smoke tag A', '#112233', now()),
        (tag_b, tenant_b, 'Tenant FK smoke tag B', '#112233', now());

    INSERT INTO services."ClientTags" ("Id", "TenantId", "ClientId", "TagId", "CreatedAt")
    VALUES (gen_random_uuid(), tenant_a, client_a, tag_a, now());

    FOR scenario IN
        SELECT *
        FROM (VALUES
            (client_b, tag_a, 'FK_ClientTags_Clients_TenantId_ClientId'),
            (client_a, tag_b, 'FK_ClientTags_Tags_TenantId_TagId')
        ) AS links(client_id, tag_id, expected_constraint)
    LOOP
        BEGIN
            INSERT INTO services."ClientTags" ("Id", "TenantId", "ClientId", "TagId", "CreatedAt")
            VALUES (gen_random_uuid(), tenant_a, scenario.client_id, scenario.tag_id, now());

            RAISE EXCEPTION 'ClientTags accepted a cross-tenant link. Expected % (23503).',
                scenario.expected_constraint;
        EXCEPTION WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
            IF actual_constraint IS DISTINCT FROM scenario.expected_constraint THEN
                RAISE EXCEPTION 'ClientTags violated %. Expected % (23503).',
                    actual_constraint, scenario.expected_constraint;
            END IF;
        END;
    END LOOP;
END;
$smoke$;

ROLLBACK;

\echo ClientTags tenant foreign-key smoke passed.
