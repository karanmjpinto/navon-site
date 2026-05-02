ALTER TABLE "metrics_seed" RENAME TO "metrics";--> statement-breakpoint
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_seed_org_id_orgs_id_fk";--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
