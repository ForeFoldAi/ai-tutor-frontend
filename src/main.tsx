import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAuthStore } from "./lib/auth-store";

async function bootstrap() {
  await useAuthStore.persist.rehydrate();
  useAuthStore.getState().setHasHydrated(true);
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
