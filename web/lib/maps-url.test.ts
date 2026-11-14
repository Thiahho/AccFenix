import { describe, expect, it } from "vitest";
import { isGoogleHost, isMapsUrl, isShortMapsUrl, mapsLink, mapsPlaceLink, mapsRouteLegs, parseMapsUrl, routeStop } from "./maps-url";

const streetView =
  "https://www.google.com/maps/@-34.6041348,-58.8696918,32a,75y,36.19h,90t/data=!3m7!1e1!3m5!1sYpC2LPSkCliDOThs6N_qjw!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3DYpC2LPSkCliDOThs6N_qjw%26yaw%3D36.187496!7i13312!8i6656?entry=ttu&g_ep=EgoyMDI2MDkyOC4wIKXMDSoASAFQAw%3D%3D";

describe("parseMapsUrl", () => {
  it("lee el centro de la vista de un link de Street View", () => {
    expect(parseMapsUrl(streetView)).toEqual({ lat: -34.6041348, lng: -58.8696918 });
  });

  it("prefiere el pin del lugar sobre el centro de la vista", () => {
    const url = "https://www.google.com/maps/place/Obelisco/@-34.6040,-58.3830,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d-34.6037389!4d-58.3815704";
    expect(parseMapsUrl(url)).toEqual({ lat: -34.6037389, lng: -58.3815704 });
  });

  it("lee coordenadas de los parámetros y del path", () => {
    expect(parseMapsUrl("https://maps.google.com/?q=-34.65,-58.79")).toEqual({ lat: -34.65, lng: -58.79 });
    expect(parseMapsUrl("https://www.google.com/maps/search/?api=1&query=-34.65%2C-58.79")).toEqual({ lat: -34.65, lng: -58.79 });
    expect(parseMapsUrl("https://www.google.com.ar/maps/place/-34.65,-58.79")).toEqual({ lat: -34.65, lng: -58.79 });
  });

  it("devuelve null si no hay coordenadas o no es un link de Maps", () => {
    expect(parseMapsUrl("https://maps.google.com/?q=Av+Libertador+1200")).toBeNull();
    expect(parseMapsUrl("https://maps.app.goo.gl/AbCdEf123")).toBeNull();
    expect(parseMapsUrl("https://evil.example/maps/@-34.6,-58.8,17z")).toBeNull();
    expect(parseMapsUrl("https://www.google.com/search?q=-34.6,-58.8")).toBeNull();
    expect(parseMapsUrl("Agustina de Aragón 520")).toBeNull();
  });

  it("descarta coordenadas fuera de rango", () => {
    expect(parseMapsUrl("https://www.google.com/maps/@-134.6,-58.8,17z")).toBeNull();
    expect(parseMapsUrl("https://maps.google.com/?q=0,0")).toBeNull();
  });
});

describe("hosts", () => {
  it("reconoce links de Maps y links cortos", () => {
    expect(isMapsUrl(streetView)).toBe(true);
    expect(isMapsUrl("https://maps.app.goo.gl/AbCdEf123")).toBe(true);
    expect(isShortMapsUrl("https://maps.app.goo.gl/AbCdEf123")).toBe(true);
    expect(isShortMapsUrl("https://goo.gl/maps/AbCd")).toBe(true);
    expect(isShortMapsUrl("https://goo.gl/otra-cosa")).toBe(false);
    expect(isShortMapsUrl(streetView)).toBe(false);
  });

  it("solo sigue redirecciones hacia Google", () => {
    expect(isGoogleHost("www.google.com")).toBe(true);
    expect(isGoogleHost("maps.google.com.ar")).toBe(true);
    expect(isGoogleHost("google.com.evil.example")).toBe(false);
    expect(isGoogleHost("notgoogle.com")).toBe(false);
    expect(isGoogleHost("169.254.169.254")).toBe(false);
  });
});

describe("mapsLink", () => {
  it("arma un link al punto con 6 decimales", () => {
    expect(mapsLink({ lat: -34.6041348, lng: -58.8696918 })).toBe("https://www.google.com/maps?q=-34.604135,-58.869692");
  });
});

describe("routeStop", () => {
  it("prefiere coordenadas con 6 decimales", () => {
    expect(routeStop({ address: "Av. Rivadavia 100", locality: "Morón", latitude: -34.6041348, longitude: -58.8696918 })).toBe("-34.604135,-58.869692");
  });

  it("usa dirección y localidad si no hay coordenadas", () => {
    expect(routeStop({ address: " Av. Rivadavia 100 ", locality: "Morón", latitude: null, longitude: null })).toBe("Av. Rivadavia 100, Morón");
    expect(routeStop({ address: null, locality: "Morón", latitude: null, longitude: null })).toBe("Morón");
  });

  it("devuelve null si no hay ningún dato", () => {
    expect(routeStop({ address: null, locality: "  ", latitude: null, longitude: -58.6 })).toBeNull();
  });
});

describe("mapsPlaceLink", () => {
  it("con coordenadas abre el punto", () => {
    expect(mapsPlaceLink({ address: "X 1", locality: "Y", latitude: -34.6, longitude: -58.6 })).toBe("https://www.google.com/maps?q=-34.600000,-58.600000");
  });

  it("sin coordenadas busca la dirección", () => {
    const url = new URL(mapsPlaceLink({ address: "Av. Siempre Viva 742", locality: "Morón", latitude: null, longitude: null })!);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe("Av. Siempre Viva 742, Morón");
  });

  it("sin datos no hay link", () => {
    expect(mapsPlaceLink({ address: null, locality: null, latitude: null, longitude: null })).toBeNull();
  });
});

describe("mapsRouteLegs", () => {
  const stops = (n: number) => Array.from({ length: n }, (_, i) => `Calle ${i + 1}, Morón`);
  const params = (url: string) => new URL(url).searchParams;

  it("sin paradas no hay tramos", () => {
    expect(mapsRouteLegs([])).toEqual([]);
  });

  it("una parada es solo destino, desde la ubicación del dispositivo", () => {
    const [leg] = mapsRouteLegs(["-34.600000,-58.600000"]);
    const p = params(leg.url);
    expect(leg.url.startsWith("https://www.google.com/maps/dir/?")).toBe(true);
    expect(p.get("api")).toBe("1");
    expect(p.get("travelmode")).toBe("driving");
    expect(p.get("destination")).toBe("-34.600000,-58.600000");
    expect(p.has("origin")).toBe(false);
    expect(p.has("waypoints")).toBe(false);
    expect(leg).toMatchObject({ from: 1, to: 1 });
  });

  it("respeta el orden manual: paradas intermedias como waypoints y la última como destino", () => {
    const [leg] = mapsRouteLegs(["C", "A", "B"]);
    expect(params(leg.url).get("waypoints")).toBe("C|A");
    expect(params(leg.url).get("destination")).toBe("B");
  });

  it("hasta 10 paradas entran en un tramo", () => {
    const legs = mapsRouteLegs(stops(10));
    expect(legs).toHaveLength(1);
    expect(params(legs[0].url).get("waypoints")!.split("|")).toHaveLength(9);
    expect(legs[0]).toMatchObject({ from: 1, to: 10 });
  });

  it("más de 10 paradas se parten y cada tramo sale de la última parada del anterior", () => {
    const all = stops(23);
    const legs = mapsRouteLegs(all);
    expect(legs.map((l) => [l.from, l.to])).toEqual([[1, 10], [11, 20], [21, 23]]);
    const second = params(legs[1].url);
    expect(second.get("origin")).toBe(all[9]);
    expect(second.get("waypoints")!.split("|")).toEqual(all.slice(10, 19));
    expect(second.get("destination")).toBe(all[19]);
    expect(params(legs[2].url).get("origin")).toBe(all[19]);
    expect(params(legs[2].url).get("destination")).toBe(all[22]);
  });

  it("ningún link supera los 2048 caracteres", () => {
    const long = Array.from({ length: 12 }, (_, i) => `${"Avenida Presidente Bartolomé Mitre ".repeat(6)}${i + 1}, Ciudad Autónoma de Buenos Aires`);
    const legs = mapsRouteLegs(long);
    // By count alone 10 would fit; the length limit forces a shorter first leg.
    expect(legs[0].to).toBeLessThan(10);
    for (const leg of legs) expect(leg.url.length).toBeLessThanOrEqual(2048);
    // Se recorren todas las paradas, en orden y sin saltear ninguna.
    expect(legs[0].from).toBe(1);
    expect(legs.at(-1)!.to).toBe(12);
    legs.slice(1).forEach((leg, i) => expect(leg.from).toBe(legs[i].to + 1));
  });
});
