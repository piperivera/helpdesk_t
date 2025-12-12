const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const users = [
  { name: "Ana Ruiz",   email: "ana@titan.com",   role: "requester", area: "Operaciones" },
  { name: "Luis Pérez", email: "luis@titan.com",  role: "requester", area: "Marketing" },
  { name: "Carla Gómez",email: "carla@titan.com", role: "requester", area: "Logística" },
  { name: "Jorge Díaz", email: "jorge@titan.com", role: "requester", area: "Finanzas" },
  { name: "Marta Ríos", email: "marta@titan.com", role: "requester", area: "Recursos Humanos" },

  { name: "Soporte N1", email: "n1@titan.com",    role: "resolver",  area: "TI" },
  { name: "Soporte N2", email: "n2@titan.com",    role: "resolver",  area: "TI" },

  { name: "Admin TI 1", email: "admin1@titan.com",role: "admin",     area: "TI" },
  { name: "Admin TI 2", email: "admin2@titan.com",role: "admin",     area: "TI" },
];

async function main() {
  const passwordHash = await bcrypt.hash("Titan123!", 10);

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,      // coincide con el enum Role del schema
        area: u.area,
        passwordHash,
      },
    });
    createdUsers.push(user);
  }

  const byEmail = (email) => createdUsers.find((u) => u.email === email);

  const now = new Date();
  const addHours = (h) => new Date(now.getTime() + h * 3600 * 1000);

  // Ticket 1 - Alta prioridad
  await prisma.ticket.create({
    data: {
      number: "TIT-00001",
      title: "PC no enciende",
      description: "El equipo de caja 2 no arranca.",
      area: "TI",
      requesterId: byEmail("ana@titan.com").id,
      assigneeId: byEmail("n1@titan.com").id,
      priority: "Alta",
      type: "Incidente",
      status: "Abierto",
      dueAt: addHours(8), // SLA alta
      events: {
        create: [
          {
            action: "Ticket creado",
            by: "Ana Ruiz",
          },
        ],
      },
    },
  });

  // Ticket 2 - Media prioridad
  await prisma.ticket.create({
    data: {
      number: "TIT-00002",
      title: "Instalación de impresora",
      description: "Nueva impresora de red para el área de Marketing.",
      area: "Marketing",
      requesterId: byEmail("luis@titan.com").id,
      assigneeId: byEmail("n2@titan.com").id,
      priority: "Media",
      type: "Solicitud",
      status: "En_proceso",
      dueAt: addHours(24), // SLA media
      events: {
        create: [
          {
            action: "Ticket creado",
            by: "Luis Pérez",
          },
        ],
      },
    },
  });

  console.log("✅ Seed completado: usuarios y tickets de prueba creados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
