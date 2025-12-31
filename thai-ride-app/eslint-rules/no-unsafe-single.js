/**
 * ESLint Rule: no-unsafe-single
 * 
 * Warns when using .single() without a comment explaining why it's safe.
 * 
 * .single() throws 406 error when no rows are returned.
 * Use .maybeSingle() instead for queries that might return 0 rows.
 * 
 * ✅ Safe uses of .single():
 * - After .insert() (you just inserted, so row exists)
 * - After .update() with known existing row
 * - Query by primary key that must exist
 * 
 * ❌ Unsafe uses of .single():
 * - Query by user_id for optional records (wallet, loyalty, provider)
 * - Query by foreign key that might not exist
 * - Any query where 0 rows is a valid result
 * 
 * To suppress this warning, add a comment:
 * // eslint-disable-next-line no-unsafe-single -- row guaranteed to exist after insert
 * .single()
 */

const noUnsafeSingle = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when using .single() which throws 406 error on empty results',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      unsafeSingle: '.single() throws 406 error when no rows found. Use .maybeSingle() instead, or add a comment explaining why .single() is safe here.',
      suggestion: 'Consider using .maybeSingle() which returns null instead of throwing an error when no rows are found.'
    },
    hasSuggestions: true,
    schema: []
  },
  
  create(context) {
    // Tables that commonly have optional records per user
    const optionalTables = [
      'user_wallets',
      'user_loyalty',
      'service_providers',
      'safety_profiles',
      'company_employees',
      'user_preferences'
    ]
    
    return {
      CallExpression(node) {
        // Check if it's a .single() call
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'single'
        ) {
          // Get the source code to check for preceding comments
          const sourceCode = context.getSourceCode()
          const comments = sourceCode.getCommentsBefore(node)
          
          // Check if there's a comment explaining the use
          const hasExplanation = comments.some(comment => 
            comment.value.includes('single() is safe') ||
            comment.value.includes('row guaranteed') ||
            comment.value.includes('row exists') ||
            comment.value.includes('eslint-disable')
          )
          
          if (hasExplanation) {
            return // Skip if there's an explanation
          }
          
          // Check if this is after an insert (which is safe)
          const callChain = getCallChain(node)
          const hasInsert = callChain.some(call => call === 'insert')
          
          if (hasInsert) {
            return // Safe: .insert().select().single()
          }
          
          // Check if querying an optional table
          const tableName = getTableName(node)
          const isOptionalTable = optionalTables.some(t => 
            tableName && tableName.includes(t)
          )
          
          // Report the issue
          context.report({
            node,
            messageId: 'unsafeSingle',
            suggest: [
              {
                desc: 'Replace with .maybeSingle()',
                fix(fixer) {
                  return fixer.replaceText(node.callee.property, 'maybeSingle')
                }
              }
            ]
          })
        }
      }
    }
  }
}

// Helper: Get the chain of method calls
function getCallChain(node) {
  const chain = []
  let current = node
  
  while (current && current.callee) {
    if (current.callee.property && current.callee.property.name) {
      chain.push(current.callee.property.name)
    }
    current = current.callee.object
  }
  
  return chain
}

// Helper: Try to extract table name from query chain
function getTableName(node) {
  let current = node
  
  while (current && current.callee) {
    if (
      current.callee.type === 'CallExpression' &&
      current.callee.callee &&
      current.callee.callee.property &&
      current.callee.callee.property.name === 'from'
    ) {
      const args = current.callee.arguments
      if (args && args[0] && args[0].type === 'Literal') {
        return args[0].value
      }
    }
    current = current.callee.object || current.callee
  }
  
  return null
}

export default noUnsafeSingle
