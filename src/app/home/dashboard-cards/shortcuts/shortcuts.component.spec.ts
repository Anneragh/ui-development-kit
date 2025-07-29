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

  it('should have 3 shortcut categories defined', () => {
    expect(component.shortcutCategories.length).toBe(3);
  });

  it('should have Tenant Management category with 8 shortcuts', () => {
    const tenantCategory = component.shortcutCategories.find(cat => cat.title === 'Tenant Management');
    expect(tenantCategory).toBeTruthy();
    expect(tenantCategory?.shortcuts.length).toBe(8);
  });

  it('should have Developer Resources category with 7 shortcuts', () => {
    const devCategory = component.shortcutCategories.find(cat => cat.title === 'Developer Resources');
    expect(devCategory).toBeTruthy();
    expect(devCategory?.shortcuts.length).toBe(7);
  });

  it('should have Support & Help category with 3 shortcuts', () => {
    const supportCategory = component.shortcutCategories.find(cat => cat.title === 'Support & Help');
    expect(supportCategory).toBeTruthy();
    expect(supportCategory?.shortcuts.length).toBe(3);
  });

  it('should call action when shortcut is clicked', () => {
    const shortcut = component.shortcutCategories[0].shortcuts[0];
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.onShortcutClick(shortcut);

    expect(spy).toHaveBeenCalled();
  });
}); 