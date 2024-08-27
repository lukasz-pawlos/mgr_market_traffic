import si from "systeminformation";
import { log } from "./logger";
import { CpuLog } from "../database/logDB/services/addLog";

const cpuMemoryUse = async () => {
  const cpuLoad = await si.currentLoad();
  const memory = await si.mem();

  const cpuUsage = parseFloat(cpuLoad.currentLoad.toFixed(2));
  const memoryUsage = parseFloat(((memory.active / memory.total) * 100).toFixed(2));

  const message: CpuLog = {
    cpuUsage,
    memoryUsage,
  };

  return message;
};

export const createTrafficLog = async () => {
  const message = await cpuMemoryUse();
  log("info", message, "trafficCpu");
};
