import postgres from "postgres";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const ARCHETYPES = [
  {
    name: "Wellness Mom",
    age_range: "30-39",
    gender: "female",
    profile: "Health-conscious mother who prioritizes clean ingredients and natural products for her family",
    default_makeup: "minimal, dewy skin, natural look",
    default_expression: "warm smile, approachable, slightly tired but genuine",
    default_hair: "loose waves or messy bun, natural color",
    default_clothing: "athleisure, muted earth tones, comfortable loungewear",
  },
  {
    name: "Gen Z Creator",
    age_range: "18-24",
    gender: "female",
    profile: "Trend-aware digital native, authentic and playful, always on her phone",
    default_makeup: "creative, colorful accents, glossy lips",
    default_expression: "energetic, animated, expressive eyebrows",
    default_hair: "trendy style, possibly colored highlights or curtain bangs",
    default_clothing: "streetwear, oversized tees, layered accessories",
  },
  {
    name: "Corporate Professional",
    age_range: "35-49",
    gender: "male",
    profile: "Results-driven executive who values efficiency, quality, and understated luxury",
    default_makeup: "clean-shaven or well-groomed stubble",
    default_expression: "confident, composed, slight knowing smile",
    default_hair: "clean cut, professional, slightly textured",
    default_clothing: "business casual, quality fabrics, neutral tones",
  },
  {
    name: "Fitness Enthusiast",
    age_range: "25-34",
    gender: "male",
    profile: "Dedicated gym-goer who tracks macros and optimizes performance",
    default_makeup: "none, natural post-workout glow",
    default_expression: "motivated, direct eye contact, genuine enthusiasm",
    default_hair: "short fade or athletic style",
    default_clothing: "fitted athletic wear, compression shirt, sneakers visible",
  },
  {
    name: "Skincare Addict",
    age_range: "25-34",
    gender: "female",
    profile: "Ingredient-savvy beauty enthusiast who researches every product before buying",
    default_makeup: "glass skin, minimal base, focus on skincare glow",
    default_expression: "knowledgeable, sharing a secret, conspiratorial smile",
    default_hair: "pulled back to show skin, headband or claw clip",
    default_clothing: "clean aesthetic, white or pastel top, bathroom robe",
  },
  {
    name: "Tech Bro",
    age_range: "25-34",
    gender: "male",
    profile: "Early adopter, startup culture, values innovation and efficiency in everything",
    default_makeup: "none",
    default_expression: "excited about a discovery, slightly nerdy enthusiasm",
    default_hair: "casual, slightly messy, natural",
    default_clothing: "tech company hoodie or plain tee, AirPods visible",
  },
  {
    name: "Luxury Minimalist",
    age_range: "30-44",
    gender: "female",
    profile: "Curated lifestyle, fewer but better things, sophisticated taste",
    default_makeup: "polished, natural glam, defined brows",
    default_expression: "poised, quietly confident, subtle satisfaction",
    default_hair: "sleek blowout or elegant low bun",
    default_clothing: "neutral palette, cashmere or silk, minimal jewelry",
  },
  {
    name: "College Student",
    age_range: "18-22",
    gender: "female",
    profile: "Budget-conscious student discovering what works, relatable and honest",
    default_makeup: "minimal or no makeup, natural freckles visible",
    default_expression: "genuine surprise, relatable frustration or excitement",
    default_hair: "messy bun or air-dried natural texture",
    default_clothing: "oversized hoodie, sweatpants, dorm room casual",
  },
  {
    name: "New Dad",
    age_range: "30-39",
    gender: "male",
    profile: "Sleep-deprived father figuring out life with a baby, looking for practical solutions",
    default_makeup: "none, visible tiredness under eyes",
    default_expression: "tired but happy, genuine, self-deprecating humor",
    default_hair: "slightly disheveled, needs a cut",
    default_clothing: "wrinkled t-shirt, joggers, spit-up stain optional",
  },
  {
    name: "Wellness Influencer",
    age_range: "25-34",
    gender: "female",
    profile: "Holistic health advocate, practices what she preaches, morning routine queen",
    default_makeup: "sun-kissed, bronzer, natural flush",
    default_expression: "serene, intentional, warm and inviting",
    default_hair: "beachy waves, natural highlights",
    default_clothing: "linen set, earth tones, crystal necklace",
  },
  {
    name: "Blue Collar Worker",
    age_range: "35-50",
    gender: "male",
    profile: "Hardworking tradesman, no-nonsense, values things that actually work",
    default_makeup: "none, weathered skin, calloused hands visible",
    default_expression: "straight-talking, skeptical turned believer",
    default_hair: "practical cut, possibly hat hair",
    default_clothing: "work shirt, jeans, boots, tool belt or hard hat nearby",
  },
  {
    name: "Glam Influencer",
    age_range: "22-30",
    gender: "female",
    profile: "Beauty content creator, transformation queen, lives for the before/after",
    default_makeup: "full glam, lashes, contour, glossy lips",
    default_expression: "dramatic, playful, camera-aware confidence",
    default_hair: "styled and voluminous, possibly extensions",
    default_clothing: "trendy outfit, matching set, visible brand pieces",
  },
];

async function main() {
  console.log("\nSeeding Sora UGC Studio database...\n");

  // 1. App Config
  await sql`
    INSERT INTO app_config (brand_name, brand_color, portal_title, features, workflows)
    VALUES (
      'Sora UGC Studio',
      '#3b82f6',
      'Sora UGC Studio',
      '{"video_generation": true}'::jsonb,
      '{}'::jsonb
    )
    ON CONFLICT DO NOTHING
  `;
  console.log("  + app_config");

  // 2. Archetypes
  for (const arch of ARCHETYPES) {
    await sql`
      INSERT INTO archetypes (name, age_range, gender, profile, default_makeup, default_expression, default_hair, default_clothing)
      VALUES (${arch.name}, ${arch.age_range}, ${arch.gender}, ${arch.profile}, ${arch.default_makeup}, ${arch.default_expression}, ${arch.default_hair}, ${arch.default_clothing})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`  + ${ARCHETYPES.length} archetypes`);

  console.log("\nDone! Run 'npm run dev' to start the app.\n");
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
