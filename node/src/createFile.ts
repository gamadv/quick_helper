import fs from 'fs';

export function generateConstantsFile(values: unknown, filename = 'myfile') {

    const parseFileName = `${filename}.ts`

    const parseValues = `
  export const valueConstantCreated = ${JSON.stringify(values)};
  `;

    fs.writeFile(`src/${parseFileName}`, parseValues, (err) => {
        if (err) {
            console.error(`Error writing ${filename}:`, err);
        } else {
            console.log(`${filename} has been generated.`);
        }
    });
}