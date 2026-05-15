const requiredValues = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    value: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  {
    name: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
    value: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
];

const placeholderPattern = /your-|your_|project-ref|project-id|example/i;
const failures = [];

for (const item of requiredValues) {
  const value = item.value?.trim();

  if (!value) {
    failures.push(`${item.name} is missing`);
    continue;
  }

  if (placeholderPattern.test(value)) {
    failures.push(`${item.name} still contains a placeholder value`);
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (siteUrl && placeholderPattern.test(siteUrl)) {
  failures.push("NEXT_PUBLIC_SITE_URL still contains a placeholder value");
}

if (failures.length) {
  console.error("Launch environment check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Launch environment check passed.");
