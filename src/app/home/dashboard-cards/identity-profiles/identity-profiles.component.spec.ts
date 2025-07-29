import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { IdentityProfilesComponent } from './identity-profiles.component';

describe('IdentityProfilesComponent', () => {
  let component: IdentityProfilesComponent;
  let fixture: ComponentFixture<IdentityProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentityProfilesComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(IdentityProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
