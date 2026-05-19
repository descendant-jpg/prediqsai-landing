import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function RegisterScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(auth)/login");
  }, []);
  return null;
}
