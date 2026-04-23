export function createToggle(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLLabelElement {
  const wrapper = document.createElement('label');

  wrapper.className =
    'inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#eee6d2]/10 bg-[#eee6d2]/6 px-3 py-2 text-sm font-semibold text-[#eee6d2] transition hover:border-emerald-300/40 hover:bg-emerald-300/10';

  const input = document.createElement('input');

  input.type = 'checkbox';
  input.checked = checked;
  input.className = 'h-4 w-4 accent-emerald-300';
  input.addEventListener('change', () => {
    onChange(input.checked);
  });

  const text = document.createElement('span');

  text.textContent = label;
  wrapper.append(input, text);

  return wrapper;
}

export function createRangeControl(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
): HTMLLabelElement {
  const wrapper = document.createElement('label');

  wrapper.className =
    'inline-flex min-w-48 items-center gap-3 rounded-full border border-[#eee6d2]/10 bg-[#eee6d2]/6 px-3 py-2 text-sm font-semibold text-[#eee6d2]';

  const text = document.createElement('span');

  text.textContent = label;

  const input = document.createElement('input');

  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.className = 'w-24 accent-emerald-300';
  input.addEventListener('input', () => {
    onChange(Number.parseInt(input.value, 10));
  });

  wrapper.append(text, input);

  return wrapper;
}

export function createActionButton(
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement('button');

  button.type = 'button';
  button.textContent = label;
  button.className =
    'rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-[#0b0f0d] transition hover:-translate-y-0.5 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#0b0f0d]';
  button.addEventListener('click', onClick);

  return button;
}
