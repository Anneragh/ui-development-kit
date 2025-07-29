import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttachRuleComponent } from './attach-rule.component';

describe('AttachRuleComponent', () => {
  let component: AttachRuleComponent;
  let fixture: ComponentFixture<AttachRuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttachRuleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AttachRuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct title', () => {
    expect(component.title).toBe('Attach Rule');
  });
});
