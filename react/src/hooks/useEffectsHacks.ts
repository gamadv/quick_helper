import { useEffect, useRef } from 'react'

export function useOnMount(callback: any) {
    useEffect(callback, [])
}

export function useOnUnMount(callback: any) {
    useEffect(() => {
        return callback
    }, [])
}

export function useOnUpdate(effectCallback: any, deps = []) {
    const isFirstMount = useRef(false)

    useEffect(() => {
        return () => {
            isFirstMount.current = false
        }
    }, [])
    useEffect(() => {
        // Do not execute effectcallback for the first time
        if (!isFirstMount.current) {
            isFirstMount.current = true
        } else {
            return effectCallback()
        }
    }, deps)
}
