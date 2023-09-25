import fs from 'fs'
import path from 'path'

export function generateConstantsFile(
  values: unknown,
  filename = 'unnamed_file',
  filePath = 'src',
) {
  const parseFileName = `${filename}.gen.ts`

  const parseValues = `
  export const valueConstantCreated = ${JSON.stringify(values)};
  `
  const fullFilePath = path.join(filePath, parseFileName)

  fs.writeFile(fullFilePath, parseValues, (err) => {
    if (err) {
      console.error(`Error writing ${filename}:`, err)
    } else {
      console.log(`${filename} has been generated.`)
    }
  })
}
