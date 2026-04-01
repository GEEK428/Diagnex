const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const systems = [
    {
      name: "NAMASTE",
      displayName: "NAMASTE Terminology",
      description: "Local terminology repository",
      version: "1.0",
      type: "LOCAL",
      isActive: true,
      createdBy: "seed"
    },
    {
      name: "ICD11_TM2",
      displayName: "ICD-11 Traditional Medicine",
      description: "Terminology authority source",
      version: "2025-06",
      type: "AUTHORITY",
      isActive: true,
      createdBy: "seed"
    },
    {
      name: "ICD11_BIOMED",
      displayName: "ICD-11 Biomedicine",
      description: "Terminology authority source",
      version: "2025-06",
      type: "AUTHORITY",
      isActive: true,
      createdBy: "seed"
    }
  ];

  for (const system of systems) {
    await prisma.codeSystem.upsert({
      where: { name: system.name },
      update: {
        displayName: system.displayName,
        description: system.description,
        version: system.version,
        type: system.type,
        isActive: system.isActive,
        createdBy: system.createdBy
      },
      create: system
    });
  }

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
