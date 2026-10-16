import { useCallback, useState } from "react";
import ReauthModal from "../components/ReauthModal";

/**
 * Gate a sensitive action behind an email OTP confirmation.
 * Usage:
 *   const { confirm, modal } = useActionReauth();
 *   <button onClick={() => confirm((reauthToken) => updateService(id, data, reauthToken))} />
 *   {modal}
 */
export default function useActionReauth() {
  const [run, setRun] = useState(null);

  const confirm = useCallback((action) => setRun(() => action), []);

  const handleVerified = useCallback(
    async (reauthToken) => {
      const action = run;
      setRun(null);
      if (action) await action(reauthToken);
    },
    [run]
  );

  const modal = run ? (
    <ReauthModal onClose={() => setRun(null)} onVerified={handleVerified} />
  ) : null;

  return { confirm, modal };
}
