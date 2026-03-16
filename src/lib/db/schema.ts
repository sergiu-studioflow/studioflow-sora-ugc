import { pgTable, text, boolean, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";

// =============================================
// BETTER AUTH TABLES (managed by better-auth — do not modify manually)
// =============================================

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const authSession = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const authVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// =============================================
// USERS (portal profile — linked to Better Auth user)
// =============================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique().references(() => authUser.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"), // admin, member, viewer
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// =============================================
// APP CONFIGURATION (single row)
// =============================================

export const appConfig = pgTable("app_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandName: text("brand_name").notNull(),
  brandColor: text("brand_color").default("#b2ff00"),
  logoUrl: text("logo_url"),
  portalTitle: text("portal_title"),
  features: jsonb("features").notNull().default({}),
  workflows: jsonb("workflows").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// =============================================
// ARCHETYPES — Pre-seeded character library
// =============================================

export const archetypes = pgTable("archetypes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ageRange: text("age_range").notNull(),
  gender: text("gender").notNull(),
  profile: text("profile").notNull(),
  defaultMakeup: text("default_makeup"),
  defaultExpression: text("default_expression"),
  defaultHair: text("default_hair"),
  defaultClothing: text("default_clothing"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// =============================================
// GENERATIONS — Core video generation job table
// =============================================

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),

  // Input fields
  archetypeId: uuid("archetype_id").references(() => archetypes.id),
  creativeDirection: text("creative_direction"),
  characterDescription: text("character_description"),
  ageRange: text("age_range"),
  gender: text("gender"),
  makeup: text("makeup"),
  expression: text("expression"),
  hair: text("hair"),
  clothing: text("clothing"),
  productImageUrl: text("product_image_url"),
  aspectRatio: text("aspect_ratio").notNull().default("9:16"),
  duration: integer("duration").notNull().default(8),

  // Claude output
  sceneDescription: text("scene_description"),
  dialogue: text("dialogue"),
  complianceNotes: text("compliance_notes"),
  negativePrompt: text("negative_prompt"),
  fullPrompt: text("full_prompt"),

  // Sora tracking
  soraJobId: text("sora_job_id"),
  soraModel: text("sora_model").default("sora-2"),

  // Status: draft | generating_prompt | prompt_ready | creating_video | video_ready | error
  status: text("status").notNull().default("draft"),

  // Output
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  estimatedCost: text("estimated_cost"),
  actualCost: text("actual_cost"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// =============================================
// ACTIVITY LOG
// =============================================

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
