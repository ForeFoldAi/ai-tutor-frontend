import { QueryClient, QueryFunction } from "@tanstack/react-query";

type DemoAccount = {
  username: string;
  password: string;
  role: "student" | "tutor" | "school_admin" | "master_admin" | "org_admin";
  fullName: string;
  email: string;
};

const demoAccounts: DemoAccount[] = [
  {
    username: import.meta.env.VITE_TEST_STUDENT_USERNAME || "student",
    password: import.meta.env.VITE_TEST_STUDENT_PASSWORD || "password",
    role: "student",
    fullName: "Rajesh Kumar",
    email: "student@example.com",
  },
  {
    username: import.meta.env.VITE_TEST_TUTOR_USERNAME || "tutor",
    password: import.meta.env.VITE_TEST_TUTOR_PASSWORD || "password",
    role: "tutor",
    fullName: "Tutor User",
    email: "tutor@example.com",
  },
  {
    username: import.meta.env.VITE_TEST_SCHOOL_ADMIN_USERNAME || "admin",
    password: import.meta.env.VITE_TEST_SCHOOL_ADMIN_PASSWORD || "password",
    role: "school_admin",
    fullName: "School Admin User",
    email: "school.admin@example.com",
  },
  {
    username: import.meta.env.VITE_TEST_MASTER_ADMIN_USERNAME || "master",
    password: import.meta.env.VITE_TEST_MASTER_ADMIN_PASSWORD || "password",
    role: "master_admin",
    fullName: "Master Admin User",
    email: "master.admin@example.com",
  },
  {
    username: import.meta.env.VITE_TEST_ORG_ADMIN_USERNAME || "organization",
    password: import.meta.env.VITE_TEST_ORG_ADMIN_PASSWORD || "password",
    role: "org_admin",
    fullName: "Organization Admin User",
    email: "org.admin@example.com",
  },
];

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // No API calls - return immediate mock responses for UI display only
  if (url === "/api/auth/login" && method === "POST") {
    const loginData = data as { username: string; password: string };
    const account = demoAccounts.find(
      (a) =>
        a.username.toLowerCase() === (loginData.username || "").trim().toLowerCase() &&
        a.password === (loginData.password || ""),
    );
    if (!account) {
      return new Response(
        JSON.stringify({ message: "Invalid username or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    const mockUser = {
      id: `demo-${account.role}`,
      username: account.username,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      avatar: null,
    };
    return new Response(JSON.stringify({
      user: mockUser,
      token: "demo-token-no-api",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (url === "/api/auth/signup" && method === "POST") {
    const signupData = data as {
      username: string;
      email: string;
      fullName: string;
      password: string;
      role: string;
    };
    // Return mock user data without any API call
    const mockUser = {
      id: "demo-user-1",
      username: signupData.username || "demo",
      email: signupData.email || "demo@example.com",
      fullName: signupData.fullName || "Demo User",
      role: signupData.role || "student",
      avatar: null,
    };
    return new Response(JSON.stringify({
      user: mockUser,
      token: "demo-token-no-api",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For other endpoints, return empty response
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  <T,>({ on401: _unauthorizedBehavior }: { on401: UnauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // No API calls - return empty data immediately for UI display only
    // Return empty arrays for list endpoints, null for single item endpoints
    const url = queryKey.join("/") as string;
    if (url.includes("/api/")) {
      return [] as unknown as T;
    }
    return null as unknown as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
