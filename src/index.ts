// Ursa grammar and parser.
// © Reuben Thomas 2023
// Released under the MIT license.

import {Node} from 'ohm-js'
// eslint-disable-next-line import/extensions
import grammar, {UrsaSemantics} from './ursa.ohm-bundle.js'

// eslint-disable-next-line import/extensions
export {default as grammar, UrsaSemantics} from './ursa.ohm-bundle.js'

// Specify precise type so semantics can be precisely type-checked.
export const semantics: UrsaSemantics = grammar.createSemantics()

function mergeBoundVars(children: Node[]): string[] {
  const boundVars: string[] = []
  children.forEach((child) => boundVars.push(...child.boundVars))
  return boundVars
}

semantics.addAttribute<String[]>('boundVars', {
  _terminal() {
    return []
  },
  _nonterminal(...children) {
    return mergeBoundVars(children)
  },
  _iter(...children) {
    return mergeBoundVars(children)
  },

  Sequence(_exps, _sc) {
    return []
  },

  Fn(_fn, _open, _params, _maybe_comma, _close, _body) {
    return []
  },

  Let(_let, ident, _eq, _val) {
    return [ident.sourceString]
  },
})

class FreeVars<T> extends Map<string, T[]> {
  merge(moreVars: FreeVars<T>): FreeVars<T> {
    for (const [name, symrefs] of moreVars) {
      if (!this.has(name)) {
        this.set(name, [])
      }
      this.get(name)!.push(...symrefs)
    }
    return this
  }
}

function mergeFreeVars<EnvType, RefType>(env: EnvType, children: Node[]): FreeVars<RefType> {
  const freeVars = new FreeVars<RefType>()
  children.forEach((child) => freeVars.merge(child.freeVars(env)))
  return freeVars
}

semantics.addOperation<Map<string, any>>('freeVars(env)', {
  _terminal() {
    return new FreeVars()
  },
  _nonterminal(...children) {
    return mergeFreeVars(this.args.env, children)
  },
  _iter(...children) {
    return mergeFreeVars(this.args.env, children)
  },

  Sequence(exps, _sc) {
    const freeVars = new FreeVars()
    const boundVars: string[] = []
    exps.asIteration().children.forEach((exp) => {
      boundVars.push(...exp.boundVars)
      freeVars.merge(exp.freeVars(this.args.env.push(boundVars)))
    })
    boundVars.forEach((b: string) => freeVars.delete(b))
    return freeVars
  },

  PropertyValue(_ident, _colon, value) {
    return value.freeVars(this.args.env)
  },

  PropertyExp_property(propertyExp, _dot, _ident) {
    return propertyExp.freeVars(this.args.env)
  },

  CallExp_property(propertyExp, _dot, _ident) {
    return propertyExp.freeVars(this.args.env)
  },

  Fn(_fn, _open, params, _maybe_comma, _close, body) {
    const paramStrings = params.asIteration().children.map((x) => x.sourceString)
    const innerEnv = this.args.env.pushFrame([[...paramStrings], []])
    const freeVars = new FreeVars().merge(body.freeVars(innerEnv))
    paramStrings.forEach((p) => freeVars.delete(p))
    return freeVars
  },

  Lets(lets) {
    const letIds = lets.asIteration().children.map((x) => x.children[1].sourceString)
    const innerEnv = this.args.env.push(letIds)
    const freeVars = new FreeVars()
    for (const l of lets.asIteration().children) {
      freeVars.merge(l.children[3].freeVars(innerEnv))
    }
    for (const id of letIds) {
      freeVars.delete(id)
    }
    return freeVars
  },

  For(_for, ident, _of, iterator, body) {
    const forVar = ident.sourceString
    const innerEnv = this.args.env.push(['_for', forVar])
    const freeVars = new FreeVars().merge(iterator.freeVars(this.args.env))
      .merge(body.freeVars(innerEnv))
    freeVars.delete(forVar)
    return freeVars
  },

  Use(_use, pathList) {
    const path = pathList.asIteration().children
    const ident = path[path.length - 1]
    const innerEnv = this.args.env.push([ident.sourceString])
    const freeVars = new FreeVars().merge(path[0].symref(innerEnv).freeVars)
    freeVars.delete(ident.sourceString)
    return freeVars
  },

  ident(_ident) {
    return this.symref(this.args.env).freeVars
  },
})
