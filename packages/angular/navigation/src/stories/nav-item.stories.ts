import { Component, signal } from '@angular/core';
import { RouterLink, provideRouter } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';

@Component({ selector: 'lc-nav-item-page', template: '' })
class PageComponent {}

/** Demo: the application, not the URL, picks the active entry (same URL reached from two sections). */
@Component({
  selector: 'lc-nav-item-chosen-demo',
  imports: [LcNavListComponent, LcNavItemComponent, RouterLink],
  template: `
    <nav aria-label="Navigation principale" style="max-width:16rem">
      <lc-nav-list>
        <a lcNavItem routerLink="/overview" icon="house" [active]="section() === 'overview'" (click)="section.set('overview')">Vue d'ensemble</a>
        <a lcNavItem routerLink="/overview" icon="triangle-alert" [active]="section() === 'alerts'" (click)="section.set('alerts')">Alertes</a>
      </lc-nav-list>
    </nav>`,
})
class NavItemChosenDemoComponent {
  protected readonly section = signal<'overview' | 'alerts'>('alerts');
}

/**
 * Navigation link. By default the current URL decides which entry is active; set `active` to let the application decide
 * (the URL is then ignored). The active entry gets `aria-current`: `page` by default, `true` for a section when a sub-page is shown.
 *
 * Import: `import { LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<LcNavItemComponent> = {
  title: 'Navigation/Nav item',
  component: LcNavItemComponent,
  args: { icon: 'house', badge: '3', active: true, ariaCurrentWhenActive: 'page' },
  argTypes: { ariaCurrentWhenActive: { control: 'select', options: ['page', 'location', 'true'] } },
  decorators: [
    applicationConfig({ providers: [provideRouter([{ path: 'overview', component: PageComponent }])] }),
    moduleMetadata({ imports: [LcNavListComponent, LcNavItemComponent, RouterLink, NavItemChosenDemoComponent] }),
  ],
};
export default meta;
type Story = StoryObj<LcNavItemComponent>;

/** Every input is bound; `active` set to true or false overrides the URL. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<nav aria-label="Navigation principale" style="max-width:16rem">
      <lc-nav-list>
        <a lcNavItem routerLink="/overview" [icon]="icon" [badge]="badge" [active]="active" [ariaCurrentWhenActive]="ariaCurrentWhenActive">Vue d'ensemble</a>
      </lc-nav-list>
    </nav>`,
  }),
};

/** Two entries share one URL; clicking one makes it the active entry, whatever the URL. */
export const ActiveChosenByTheApplication: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-nav-item-chosen-demo />` }),
};
