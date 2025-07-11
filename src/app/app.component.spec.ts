import { TestBed, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { ElectronService } from './core/services';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

(globalThis as any).structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
@Component({ template: '' })
class DummyHomeComponent {}

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      imports: [
        AppComponent, // 👈 standalone component goes here
        DummyHomeComponent,
        TranslateModule.forRoot(),
        RouterTestingModule.withRoutes([
          { path: 'home', component: DummyHomeComponent },
        ]),
      ],
      providers: [ElectronService],
    }).compileComponents();
  }));

  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
