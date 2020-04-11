import { snakeCase } from 'lodash';
import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class DBNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string): string {
    return customName ? customName : snakeCase(propertyName);
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return this.createNameFromTableColumns(tableOrName, columnNames, 'pkey');
  }

  uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    return this.createNameFromTableColumns(tableOrName, columnNames, 'unique');
  }

  relationConstraintName(tableOrName: Table | string, columnNames: string[], where?: string): string {
    const suffix = where ? `relation_${where}` : 'relation';
    return this.createNameFromTableColumns(tableOrName, columnNames, suffix);
  }

  defaultConstraintName(tableOrName: Table | string, columnName: string): string {
    return this.createNameFromTableColumns(tableOrName, [columnName], 'default_constraint');
  }

  foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return this.createNameFromTableColumns(tableOrName, columnNames, 'foreign');
  }

  indexName(tableOrName: Table | string, columnNames: string[], where?: string): string {
    const suffix = where ? `index_${where}` : 'index';
    return this.createNameFromTableColumns(tableOrName, columnNames, suffix);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName} ${referencedColumnName}`);
  }

  private createNameFromTableColumns(tableOrName: Table | string, columnNames: string[], suffix: string) {
    const clonedColumnNames = [...columnNames];

    clonedColumnNames.sort();

    const table = tableOrName instanceof Table ? tableOrName.name : tableOrName;
    const replacedTableName = table.replace('.', '_');
    const replacedColumnNames = clonedColumnNames.join('_');

    return `${replacedTableName}_${replacedColumnNames}_${suffix}`.toLowerCase();
  }
}
