import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { TrafficLogData } from "./database/logDB/services/addLog";
import { log } from "./logger/logger";

const API_URL = "http://market_service:3000/api";
const characters = "abcdefghijklmnopqrstuvwxyz";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
      requestId: string;
    };
  }
}

axios.interceptors.request.use(
  (config) => {
    const requestId = uuidv4();
    config.headers["X-Request-Id"] = requestId;
    config.metadata = { startTime: new Date(), requestId };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    const endTime = new Date();
    if (response.config.metadata?.startTime) {
      const duration = endTime.getTime() - response.config.metadata.startTime.getTime();

      const message: TrafficLogData = {
        requestId: response.config.metadata.requestId,
        apiTime: duration,
      };
      log("info", message, "trafficLog");
    } else {
      console.warn("Brak zarejestrowanego czasu wysłania w metadata.");
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const generateString = (length: number): string => {
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

const generateMail = (length: number): string => {
  return `${generateString(length)}@example.com`;
};

// Funkcja tworząca użytkownika
export const createUser = async () => {
  try {
    const text = generateString(6);
    const response = await axios.post(`${API_URL}/user/create`, {
      name: text,
      surname: text,
      username: text,
      password: text,
      email: generateMail(6),
    });
    return response.data.result;
  } catch (error) {
    console.error(error);
  }
};

// Funkcja dodająca pieniądze użytkownikowi
export const addMoneyToUser = async (userId: number, money: number) => {
  try {
    await axios.post(`${API_URL}/user/money`, { userId, money });
  } catch (error) {
    // @ts-ignore
    console.error(error);
  }
};

// Funkcja tworząca firmę
export const createCompany = async () => {
  try {
    const response = await axios.post(`${API_URL}/company/create`, { name: generateString(6) });
    return response.data.result;
  } catch (error) {
    // @ts-ignore
    console.error(error);
  }
};

// Funkcja przydzielająca akcje użytkownikowi
export const addStock = async (userId: number, companyId: number, amount: number) => {
  try {
    await axios.post(`${API_URL}/stock/create`, { companyId, userId, amount });
  } catch (error) {
    // @ts-ignore
    console.error(error.response.data.message);
  }
};

// Funkcja tworząca kurs akcji
export const createStockRate = async (companyId: number, rate: number) => {
  try {
    await axios.post(`${API_URL}/stockrate/create`, { companyId, rate });
  } catch (error) {
    // @ts-ignore
    console.error(error.response.data.message);
  }
};

// Funkcja pobierająca aktualny kurs akcji
export const getCurrentStockRate = async (companyId: number): Promise<number | null> => {
  try {
    const response = await axios.get(`${API_URL}/stockrate/company/${companyId}`);
    return response.data;
  } catch (error) {
    // @ts-ignore
    console.error(error.response.data.message);
    return null;
  }
};

// Symulacja zakupu akcji
export const simulateBuying = async (
  userId: number,
  companyId: number,
  amount: number,
  priceModifier: number = 1.1
) => {
  try {
    const currentRate = Number(await getCurrentStockRate(companyId));
    if (currentRate !== null) {
      const max_price = Number((currentRate * priceModifier).toFixed(2)); // Dynamicznie modyfikuj cenę na podstawie priceModifier
      const date_limit = new Date(Date.now() + 60000 * 3); // 3 minuty do przodu
      await axios.post(`${API_URL}/buyoffer/create`, { userId, companyId, max_price, amount, date_limit });
    }
  } catch (error) {
    // @ts-ignore
    console.error(error.response.data.message);
  }
};

// Symulacja sprzedaży akcji
export const simulateSelling = async (
  userId: number,
  companyId: number,
  amount: number,
  priceModifier: number = 0.9
) => {
  try {
    const currentRate = Number(await getCurrentStockRate(companyId));
    if (currentRate !== null) {
      const min_price = Number((currentRate * priceModifier).toFixed(2)); // Dynamicznie modyfikuj cenę na podstawie priceModifier
      const date_limit = new Date(Date.now() + 60000 * 3); // 1 godzina do przodu
      await axios.post(`${API_URL}/selloffer/create`, { userId, companyId, min_price, amount, date_limit });
    }
  } catch (error) {
    // @ts-ignore
    console.error(error.response.data.message);
  }
};
