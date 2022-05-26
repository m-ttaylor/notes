const average = require('../utils/for_testing').average

describe('average', () => {
  test('of one to be itself', () => {
    const result = average([7])
    expect(result).toBe(7)
  })

  test('of many is calculated correctly', () => {
    const result = average([3, 2, 4, 5])
    expect(result).toBe(3.5)
  })

  test('of empty array to be zero', () => {
    const result = average([])
    expect(result).toBe(0)
  })
})