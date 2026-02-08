/**
 * Basic test to verify Jest setup is working correctly
 */
describe('Jest Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const message: string = 'TypeScript is working';
    expect(message).toBe('TypeScript is working');
  });

  it('should support modern JavaScript features', () => {
    const array = [1, 2, 3];
    const doubled = array.map(x => x * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});
