export type DemoLayout = Readonly<{
  graphMount: HTMLDivElement;
  header: HTMLElement;
  routeControls: HTMLDivElement;
  shell: HTMLDivElement;
  toolbar: HTMLElement;
  visualControls: HTMLDivElement;
}>;

export function createDemoLayout(app: HTMLDivElement): DemoLayout {
  app.innerHTML = '';
  document.body.className = 'm-0 bg-[#0b0f0d]';
  app.className =
    "h-dvh overflow-hidden bg-[#0b0f0d] text-[#eee6d2] antialiased font-['Avenir_Next','Trebuchet_MS',sans-serif]";

  const shell = createElement('div', [
    'relative',
    'grid',
    'h-dvh',
    'grid-rows-[auto_minmax(0,1fr)_auto]',
    'gap-3',
    'overflow-hidden',
    'p-3',
    'before:pointer-events-none',
    'before:absolute',
    'before:inset-0',
    'before:-z-10',
    'before:bg-[radial-gradient(circle_at_10%_8%,rgba(52,211,153,0.16),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(245,158,11,0.12),transparent_24%)]',
  ]) as HTMLDivElement;

  const header = createElement('header', [
    'flex',
    'items-center',
    'justify-between',
    'gap-4',
    'rounded-2xl',
    'border',
    'border-[#eee6d2]/10',
    'bg-[#151d18]/88',
    'px-4',
    'py-3',
    'shadow-[0_16px_48px_rgba(0,0,0,0.22)]',
    'backdrop-blur',
  ]);
  header.append(createHeaderCopy());

  const graphMount = createElement('div', [
    'w-full',
    'h-[calc(100dvh-150px)]',
    'min-h-[420px]',
    'overflow-hidden',
    'rounded-2xl',
    'border',
    'border-[#eee6d2]/10',
    'bg-[#101713]',
    'shadow-[inset_0_1px_0_rgba(238,230,210,0.05),0_20px_70px_rgba(0,0,0,0.28)]',
  ]) as HTMLDivElement;

  graphMount.id = 'demo-graph';

  const toolbar = createElement('footer', [
    'grid',
    'gap-2',
    'rounded-2xl',
    'border',
    'border-[#eee6d2]/10',
    'bg-[#151d18]/88',
    'p-3',
    'shadow-[0_16px_48px_rgba(0,0,0,0.2)]',
    'backdrop-blur',
    'md:grid-cols-[minmax(0,1fr)_auto]',
  ]);
  const routeControls = createElement('div', [
    'flex',
    'min-w-0',
    'flex-wrap',
    'items-center',
    'gap-2',
  ]) as HTMLDivElement;
  const visualControls = createElement('div', [
    'flex',
    'flex-wrap',
    'items-center',
    'justify-start',
    'gap-2',
    'md:justify-end',
  ]) as HTMLDivElement;

  toolbar.append(routeControls, visualControls);
  shell.append(header, graphMount, toolbar);
  app.append(shell);

  return {
    graphMount,
    header,
    routeControls,
    shell,
    toolbar,
    visualControls,
  };
}

function createHeaderCopy(): HTMLElement {
  const copy = createElement('div', ['min-w-0']);
  const title = createElement('h1', [
    'truncate',
    'text-lg',
    'font-black',
    'tracking-tight',
    'text-[#fff8e8]',
    'sm:text-xl',
  ]);
  const subtitle = createElement('p', [
    'hidden',
    'text-sm',
    'text-[#a8b8ad]',
    'sm:block',
  ]);

  title.textContent = 'Signal Desk';
  subtitle.textContent =
    'Drag nodes, dispatch packets, and test viaNodeIds routing.';
  copy.append(title, subtitle);

  return copy;
}

function createElement(
  tagName: string,
  classNames: readonly string[],
): HTMLElement {
  const element = document.createElement(tagName);

  element.className = classNames.join(' ');

  return element;
}
