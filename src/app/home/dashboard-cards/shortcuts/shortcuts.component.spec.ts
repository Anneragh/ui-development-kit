import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ShortcutsComponent } from './shortcuts.component';

describe('ShortcutsComponent', () => {
  let component: ShortcutsComponent;
  let fixture: ComponentFixture<ShortcutsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortcutsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ShortcutsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 8 shortcuts defined', () => {
    expect(component.shortcuts.length).toBe(8);
  });

  it('should call action when shortcut is clicked', () => {
    const shortcut = component.shortcuts[0];
    const spy = vi.spyOn(shortcut, 'action' as never);

    component.onShortcutClick(shortcut);

    expect(spy).toHaveBeenCalled();
  });
}); 