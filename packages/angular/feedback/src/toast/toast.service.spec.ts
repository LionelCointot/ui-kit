import { LiveAnnouncer } from '@angular/cdk/a11y';
import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcToastService } from './toast.service';

describe('LcToastService', () => {
  let service: LcToastService;
  let announce: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    announce = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers: [{ provide: LiveAnnouncer, useValue: { announce } }] });
    service = TestBed.inject(LcToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('annonce poliment, ou de façon assertive pour une erreur', () => {
    service.show({ kind: 'success', message: 'Scénario enregistré' });
    service.show({ kind: 'error', message: 'Échec de l\'enregistrement' });
    expect(announce).toHaveBeenCalledWith('Scénario enregistré', 'polite');
    expect(announce).toHaveBeenCalledWith('Échec de l\'enregistrement', 'assertive');
  });

  it("n'oblige pas un effect qui l'appelle à se relancer à chaque toast ajouté", () => {
    let runs = 0;
    TestBed.runInInjectionContext(() =>
      effect(() => {
        runs += 1;
        service.show({ kind: 'error', message: 'Échec' });
      }),
    );

    TestBed.tick();
    TestBed.tick();

    expect(runs).toBe(1);
    expect(service.toasts()).toHaveLength(1);
  });

  it('retire le toast après sa durée, sauf une erreur', () => {
    service.show({ kind: 'info', message: 'A', durationMs: 1000 });
    service.show({ kind: 'error', message: 'B' });
    vi.advanceTimersByTime(1000);
    expect(service.toasts().map((toast) => toast.message)).toEqual(['B']);
    vi.advanceTimersByTime(60_000);
    expect(service.toasts()).toHaveLength(1);
  });

  it('met le minuteur en pause puis le relance pour le temps restant', () => {
    service.show({ kind: 'info', message: 'A', durationMs: 1000 });
    const id = service.toasts()[0].id;
    vi.advanceTimersByTime(600);
    service.pause(id);
    vi.advanceTimersByTime(5000);
    expect(service.toasts()).toHaveLength(1);
    service.resume(id);
    vi.advanceTimersByTime(399);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('garde au plus 3 toasts en retirant le plus ancien qui n\'est pas une erreur', () => {
    service.show({ kind: 'error', message: 'E1' });
    service.show({ kind: 'info', message: 'I1' });
    service.show({ kind: 'info', message: 'I2' });
    service.show({ kind: 'success', message: 'S1' });
    expect(service.toasts().map((toast) => toast.message)).toEqual(['E1', 'I2', 'S1']);
    service.dismissAll();
    expect(service.toasts()).toHaveLength(0);
  });
});
