import { describe, it, expect } from 'vitest'
import { success, failure, flatMapResult, combineResults } from '@/shared/application/Result'

describe('flatMapResult', () => {
  it('chains a Result-returning transform onto a Success', () => {
    const result = flatMapResult(success(2), value => success(value * 10))

    expect(result).toEqual(success(20))
  })

  it('short-circuits with the transform failure when the transform fails', () => {
    const result = flatMapResult(success(2), () => failure('transform failed'))

    expect(result).toEqual(failure('transform failed'))
  })

  it('short-circuits with the original failure without calling the transform', () => {
    let called = false
    const result = flatMapResult(failure<string>('initial failure'), value => {
      called = true
      return success(value)
    })

    expect(result).toEqual(failure('initial failure'))
    expect(called).toBe(false)
  })
})

describe('combineResults', () => {
  it('combines every Success into a Success of the array', () => {
    const result = combineResults([success(1), success(2), success(3)])

    expect(result).toEqual(success([1, 2, 3]))
  })

  it('returns the first Failure and does not evaluate later items differently', () => {
    const result = combineResults([success(1), failure('first failure'), failure('second failure')])

    expect(result).toEqual(failure('first failure'))
  })

  it('combines an empty array into a Success of an empty array', () => {
    const result = combineResults([])

    expect(result).toEqual(success([]))
  })
})
