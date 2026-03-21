import { logout } from "../../lib/auth";
import Screen from "../../components/screen";
import Button from "../../components/ui/button";

export default function Profile() {

  return (
    <Screen>
      <Button title="Se déconnecter" onPress={logout} />
    </Screen>
  );
}