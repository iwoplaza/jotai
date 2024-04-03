System.register(["path","@babel/template"],function(u){"use strict";var l,m;return{setters:[function(o){l=o.default},function(o){m=o.default}],execute:function(){u("default",W);function o(e,i,t=[]){const n=[...f,...t];if(e.isIdentifier(i)&&n.includes(i.name))return!0;if(e.isMemberExpression(i)){const{property:a}=i;if(e.isIdentifier(a)&&n.includes(a.name))return!0}return!1}const f=["atom","atomFamily","atomWithDefault","atomWithObservable","atomWithReducer","atomWithReset","atomWithStorage","freezeAtom","loadable","selectAtom","splitAtom","unwrap","atomWithMachine","atomWithImmer","atomWithProxy","atomWithQuery","atomWithMutation","atomWithSubscription","atomWithStore","atomWithHash","atomWithLocation","focusAtom","atomWithValidate","validateAtoms","atomWithCache","atomWithRecoilValue"],h=m.default||m;function p({types:e},i){return{visitor:{ExportDefaultDeclaration(t,n){const{node:a}=t;if(e.isCallExpression(a.declaration)&&o(e,a.declaration.callee,i==null?void 0:i.customAtomNames)){const r=n.filename||"unknown";let s=l.basename(r,l.extname(r));s==="index"&&(s=l.basename(l.dirname(r)));const d=h(`
          const %%atomIdentifier%% = %%atom%%;
          export default %%atomIdentifier%%
          `)({atomIdentifier:e.identifier(s),atom:a.declaration});t.replaceWithMultiple(d)}},VariableDeclarator(t){e.isIdentifier(t.node.id)&&e.isCallExpression(t.node.init)&&o(e,t.node.init.callee,i==null?void 0:i.customAtomNames)&&t.parentPath.insertAfter(e.expressionStatement(e.assignmentExpression("=",e.memberExpression(e.identifier(t.node.id.name),e.identifier("debugLabel")),e.stringLiteral(t.node.id.name))))}}}}const c=m.default||m;function b({types:e},i){return{pre({opts:t}){if(!t.filename)throw new Error("Filename must be available")},visitor:{Program:{exit(t){const n=c(`
          globalThis.jotaiAtomCache = globalThis.jotaiAtomCache || {
            cache: new Map(),
            get(name, inst) { 
              if (this.cache.has(name)) {
                return this.cache.get(name)
              }
              this.cache.set(name, inst)
              return inst
            },
          }`)();t.unshiftContainer("body",n)}},ExportDefaultDeclaration(t,n){const{node:a}=t;if(e.isCallExpression(a.declaration)&&o(e,a.declaration.callee,i==null?void 0:i.customAtomNames)){const r=`${n.filename||"unknown"}/defaultExport`,s=c("export default globalThis.jotaiAtomCache.get(%%atomKey%%, %%atom%%)")({atomKey:e.stringLiteral(r),atom:a.declaration});t.replaceWith(s)}},VariableDeclarator(t,n){var a,r;if(e.isIdentifier(t.node.id)&&e.isCallExpression(t.node.init)&&o(e,t.node.init.callee,i==null?void 0:i.customAtomNames)&&((a=t.parentPath.parentPath)!=null&&a.isProgram()||(r=t.parentPath.parentPath)!=null&&r.isExportNamedDeclaration())){const s=`${n.filename||"unknown"}/${t.node.id.name}`,d=c("const %%atomIdentifier%% = globalThis.jotaiAtomCache.get(%%atomKey%%, %%atom%%)")({atomIdentifier:e.identifier(t.node.id.name),atomKey:e.stringLiteral(s),atom:t.node.init});t.parentPath.replaceWith(d)}}}}}function W(e,i){return{plugins:[[p,i],[b,i]]}}}}});
