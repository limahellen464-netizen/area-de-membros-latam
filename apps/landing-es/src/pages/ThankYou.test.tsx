import { fireEvent, render, screen } from "@testing-library/react";
import { MARKET } from "@/config/market";
import ThankYou from "./ThankYou";

describe("página de gracias", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/gracias?email=cliente%40example.com&utm_source=meta&utm_campaign=es_global",
    );
  });

  it("muestra las instrucciones de acceso en español", () => {
    render(<ThankYou />);

    expect(screen.getByRole("heading", { name: "¡Gracias por tu compra!" })).toBeInTheDocument();
    expect(screen.getByText(/cliente@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Acceder al área de miembros/i })).toHaveAttribute(
      "href",
      expect.stringContaining(MARKET.postPurchase.membersAreaUrl),
    );
  });

  it("abre WhatsApp con el correo de compra y el mensaje en español", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    render(<ThankYou />);

    fireEvent.click(screen.getByRole("link", { name: /Recibir mi acceso por WhatsApp/i }));

    expect(openSpy).toHaveBeenCalledOnce();
    const whatsappUrl = new URL(String(openSpy.mock.calls[0][0]));
    expect(whatsappUrl.hostname).toBe("wa.me");
    expect(whatsappUrl.searchParams.get("text")).toContain("cliente@example.com");
    expect(whatsappUrl.searchParams.get("text")).toContain("Compré");
  });
});
