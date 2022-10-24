# NAMA Protocol subgraph

Implements a subgraph for the [NAMA Protocol](https://github.com/nama-finance)

- [Subgraph on Mainnet](https://thegraph.com/explorer/subgraph?id=6K4kK8DGdtrjqc8LhukXZQAbe2Y1qtDNkYR2zfm5pC3a)
- [Subgraph on Polygon](https://api.thegraph.com/subgraphs/name/nama-finance/namapolygon)

- [Subgraph on Goerli](https://api.thegraph.com/subgraphs/name/nama-finance/namagoerli)
- [Subgraph on Mumbai](https://api.thegraph.com/subgraphs/name/nama-finance/namamumbai)

For more information about:

- The NAMA Protocol: https://docs.nama.finance
- The graph: https://thegraph.com/docs

---

## Setup for Local Development

In order to hack on the subgraph locally, first install the necessary project dependencies with Yarn:

```bash
yarn
```

Addionally, setup an actual local Graph node is also needed for this subgraph. In order to facilitate things, a Docker compose configuration is provided:

```bash
# First run a local ethereum node, e.g. hardhat or truffle
npx hardhat node

# Start the local Graph node
docker-compose -f scripts/docker-compose.yaml up -d graph-node

# Create a new subgraph
yarn create:local

# Deploy it
yarn deploy:local

# Remove it
yarn remove:local
```

The subgraph should be accessible in: <http://127.0.0.1:8000/subgraphs/name/0xroad/namagraph/graphql>

<details><summary>Example of GraphQL query to try:</summary>

```graphql
query LoanData {
  namaLoans(first: 5) {
    id
    fundType
    loanAmount
    targetAmount
  }
  collateralizedAssets(first: 5) {
    id
    loan {
      id
    }
    assetAddress
    assetIds
  }
}
```

</details>

Note that after modifications to the subgraph, simply re-deploying the subgraph is enough:

```bash
vim schema.graphql
vim subgraph.yaml.mustache
vim src/mappings/*.ts

# Redeploy the subgraph
yarn deploy:local
```

## Update to a new version of the contracts

> First setup for local development (see above)

1. Update the ABI

2. Make sure the contract addresses are updated

```bash
# Update the addresses and the start block
vim config/kovan.json
vim config/mumbai.json
```

3. Review the differences between the two version in the contract, and adapt all the handlers.

4. Regenerate the model:

```bash
yarn codegen
```

## Deploy to kovan or mumbai

> First update the [abis](./abis/) if they're not up to date

Deploy to the different networks:

```bash
# Make sure you are authenticated
graph auth https://api.thegraph.com/deploy/ <your-access-token>

# Deploy to kovan
yarn deploy:kovan

# Deploy to mumbai
yarn deploy:mumbai
```
