class MSlice { constructor(public sa: number, public sb: number, public n: number) {} }

function longest_matching_slice<T>(a : T[], a0: number, a1: number, b: T[], b0: number, b1: number, cmp: (x: T, y: T)=>boolean) : MSlice {
    var sa = a0, sb = b0, n = 0;
    var runs = [];
    for (var i = a0; i < a1; i++) {
        var new_runs = [];
        for (var j = b0; j < b1; j++) {
            if (cmp(a[i], b[j])) {
                var k = new_runs[j] = (runs[j-1] ? runs[j-1] : 0) + 1;
                if (k > n) {
                    sa = i-k+1;
                    sb = j-k+1; 
                    n = k;
                }
            }
        }
        runs = new_runs;
    }
    
    return new MSlice(sa, sb, n);
}


function matching_slices<T>(a : T[], a0: number, a1: number, b: T[], b0: number, b1: number, cmp: (x: T, y: T)=>boolean) : MSlice[] {
    var lms = longest_matching_slice(a, a0, a1, b, b0, b1, cmp);
    if (lms.n == 0)
        return [];
    
    var slices1 = matching_slices(a, a0, lms.sa, b, b0, lms.sb, cmp);
    var slices2 = matching_slices(a, lms.sa+lms.n, a1, b, lms.sb+lms.n, b1, cmp);
    
    return slices1.concat([lms]).concat(slices2);
}


export function diff<T>(a: T[], b: T[], cmp?: (x: T, y: T)=>boolean) {
    if (!cmp) cmp = (x,y) => x == y;
    var ia = 0, ib = 0;
    var slices = matching_slices(a, 0, a.length, b, 0, b.length, cmp);
    slices.push(new MSlice(a.length, b.length, 0));
    
    var result: { type: string; element?: T; bi?: number; ai?: number  }[] = [];
    
    var after = null;
    
    slices.forEach(slice=> {
        for (var i = ia; i <  slice.sa; i++)
            result.push({ type: '+', element: a[i] });
        for (var i = ib; i <  slice.sb; i++)
            result.push({ type: '-', element: b[i] });
        for (var i = 0; i < slice.n; i++)
            if (a[slice.sa + i] != b[slice.sb + i])
                result.push({ type: '=', bi: slice.sb + i, ai: slice.sa + i });
        
        after = a[slice.sa + slice.n - 1];
        ia = slice.sa + slice.n;
        ib = slice.sb + slice.n;
    });
    
    return result;
}

