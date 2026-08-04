import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';

describe('App', () => {
  it('renders creation form as first step', () => {
    render(<App />);
    expect(screen.getByText('STEP 1 OF 3')).toBeDefined();
    expect(screen.getByText('基本信息')).toBeDefined();
  });

  it('has a single level-one heading', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
  });

  it('advances a Shanghai player to the first youth decision', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('球员姓名'), '林岳');
    await user.selectOptions(screen.getByLabelText('家乡'), 'shanghai');
    await user.selectOptions(screen.getByLabelText('主位置'), 'CENTER_BACK');
    await user.click(screen.getByRole('button', { name: /开始生涯/ }));

    expect(screen.getByText('STEP 2 OF 3')).toBeVisible();
    expect(screen.getByText('你的青训机会')).toBeVisible();
  });
});
