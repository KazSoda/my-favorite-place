import { getDistance } from "./getDistance";

describe("getDistance", () => {
  it("retourne 0 pour deux points identiques", () => {
    const point = { lat: 48.8566, lng: 2.3522 };
    expect(getDistance(point, point)).toBe(0);
  });

  it("calcule la distance Paris → Londres (~341 km)", () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const distance = getDistance(paris, london);
    expect(distance).toBeGreaterThan(330);
    expect(distance).toBeLessThan(355);
  });

  it("calcule la distance Paris → New York (~5831 km)", () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const newYork = { lat: 40.7128, lng: -74.006 };
    const distance = getDistance(paris, newYork);
    expect(distance).toBeGreaterThan(5700);
    expect(distance).toBeLessThan(5950);
  });

  it("retourne un nombre positif pour deux points distincts", () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    expect(getDistance(paris, london)).toBeGreaterThan(0);
  });

  it("est symétrique (A→B == B→A)", () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    expect(getDistance(paris, london)).toBeCloseTo(getDistance(london, paris), 5);
  });
});
