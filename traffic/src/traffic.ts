import dotenv from "dotenv";
import { User } from "./types/User";
import { Company } from "./types/Company";
import {
  addMoneyToUser,
  addStock,
  createCompany,
  createStockRate,
  createUser,
  simulateBuying,
  simulateSelling,
} from "./useApi";
import { LogAppDataSource } from "./database/logDB/logDataSource";
import { createTrafficLog } from "./logger/createlog";

dotenv.config({ path: `${process.cwd()}/./.env` });

const NUMBER_OF_USERS = Number(process.env.NUM_USERS);
const NUMBER_OF_COMPANIES = Number(process.env.NUM_COMPANIES);
const REQUEST_TIME = Number(process.env.TRAFFIC_TIME_REQUEST);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRandomPriceModifier = (min: number, max: number): number => {
  return Number((Math.random() * (max - min) + min).toFixed(2));
};

const SIMULATION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
let simulationActive = true; // Flaga kontrolująca symulację

// Zmieniamy funkcję simulateUserActivity, aby sprawdzała flagę
const simulateUserActivity = async (user: User, companies: Company[]) => {
  while (simulationActive) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const amount = Math.floor(Math.random() * 10) + 1;

    if (Math.random() < 0.5) {
      const priceModifier = getRandomPriceModifier(1, 1.15);
      await simulateBuying(user.id, company.id, amount, priceModifier);
    } else {
      const priceModifier = getRandomPriceModifier(0.9, 1);
      await simulateSelling(user.id, company.id, amount, priceModifier);
    }

    await delay(REQUEST_TIME); // opóźnienie o REQUEST_TIME dla każdego użytkownika
  }
};

const simulateMarket = (users: User[], companies: Company[]) => {
  users.forEach((user) => {
    simulateUserActivity(user, companies); // uruchom aktywność dla każdego użytkownika równolegle
  });

  console.log(`Rozpoczęto symulację rynku dla ${users.length} użytkowników`);
};

// Główna funkcja startowa
const startSimulation = async () => {
  const users: User[] = [];
  const companies: Company[] = [];

  console.log("start");
  await delay(10000);
  console.log("delay");

  for (let i = 0; i < NUMBER_OF_COMPANIES; i++) {
    const company = await createCompany();
    if (company) {
      companies.push(company);
      await createStockRate(company.id, Math.random() * 10 + 1);
    }
    await delay(REQUEST_TIME / 10);
  }

  for (let i = 0; i < NUMBER_OF_USERS; i++) {
    const user = await createUser();
    if (user) {
      users.push(user);
      await addMoneyToUser(user.id, Math.floor(Math.random() * 90000) + 10000);

      for (const company of companies) {
        await addStock(user.id, company.id, Math.floor(Math.random() * 9000) + 1000);
      }
    }
    await delay(REQUEST_TIME / 10);
  }

  // Uruchamiamy symulację dla użytkowników
  simulateMarket(users, companies);

  // Ustawiamy wyłączenie symulacji po godzinie
  setTimeout(() => {
    simulationActive = false;
    console.log("Simulation ended after 1 hour.");
  }, SIMULATION_DURATION);

  console.log("Simulation started");
};

LogAppDataSource.initialize()
  .then(async () => {
    console.log("LogAppDataSource initialized successfully!");

    startSimulation();

    setInterval(async () => {
      await createTrafficLog();
    }, 5000);
  })
  .catch((error: Error) => {
    console.error("Error during LogAppDataSource initialization:", error);
  });
