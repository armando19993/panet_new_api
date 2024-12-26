const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Crear los roles
  const roles = await Promise.all(
    ["SUPERADMIN", "INTERMEDIARIO", "DUEÑO DE CUENTA", "DESPACHADOR"].map(
      (roleName) =>
        prisma.role.upsert({
          where: { name: roleName },
          update: {},
          create: {
            name: roleName,
          },
        })
    )
  );

  // Hashear contraseña para el administrador
  const hashedPassword = await bcrypt.hash("admin", 10);

  // Crear el usuario admin
  const adminUser = await prisma.user.upsert({
    where: { user: "admin" },
    update: {},
    create: {
      name: "Administrator",
      user: "admin",
      password: hashedPassword,
      profitPercent: 0.0,
    },
  });

  // Asignar todos los roles al usuario admin
  await Promise.all(
    roles.map((role) =>
      prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: role.id,
        },
      })
    )
  );

  console.log("Seed data created:", { adminUser });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
